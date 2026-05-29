import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import type { Plugin } from "vite";

/**
 * Packages that compile THREE as a bare global variable (not via require/import).
 * We inject a THREE import into ONLY these specific packages, and only AFTER
 * @rollup/plugin-commonjs has resolved their UMD module detection (enforce:'post').
 *
 * enforce:'pre' (previous approach) ran before CJS→ESM transformation, which made
 * Rollup treat the file as ESM and skip CommonJS wrapping — the UMD global branch
 * then fired with window[undefined], causing 'Cannot assign to read only property'.
 *
 * enforce:'post' runs after CJS transformation: the file is already clean ESM,
 * the UMD typeof-module check is already resolved, and adding an ES import is safe.
 */
const THREE_GLOBAL_PACKAGES = [
  "/@enable3d/",
  "/stage-js/",
  "/@davi-ai/bodyengine-three/",
  "/phaser-ce/",
  // aframe-extras is pulled in transitively by react-force-graph (VR variant)
  // via: react-force-graph → 3d-force-graph-vr → aframe-forcegraph-component → aframe-extras
  "/aframe-extras/",
  "/aframe-forcegraph-component/",
];

// engine.io-client packaging bug: the ESM build imports './globals.node.js'
// (a Node.js-specific file) but the browser version 'globals.js' was never
// published. Intercept the relative import at resolve time.
// three/webgpu doesn't exist in v0.160 — a transitive dep imports WebGPURenderer.
// Redirect to a stub that exports a dummy class + re-exports all of 'three'.
const THREE_WEBGPU_STUB = path.resolve(
  import.meta.dirname, "client/src/lib/three-webgpu-stub.js"
);
const threeWebgpuShim: Plugin = {
  name: "three-webgpu-shim",
  enforce: "pre",
  resolveId(id: string) {
    if (id === "three/webgpu" || id === "three/tsl") {
      return { id: THREE_WEBGPU_STUB, external: false };
    }
    return null;
  },
};

const engineIoGlobalsShim: Plugin = {
  name: "engine-io-globals-browser-shim",
  enforce: "pre",
  resolveId(id: string, importer?: string) {
    if (
      // Match any relative depth: ./globals.node.js or ../globals.node.js etc.
      /(\.\.\/)*globals\.node\.js$/.test(id) &&
      importer &&
      importer.replace(/\\/g, "/").includes("/engine.io-client/")
    ) {
      return path.resolve(
        import.meta.dirname,
        "client/src/lib/engine-io-browser-globals.js"
      );
    }
    return null;
  },
};

const injectThreeForKnownPackages: Plugin = {
  name: "inject-three-for-known-packages",
  enforce: "post",
  transform(code: string, id: string) {
    // Normalize Windows backslashes for consistent matching
    const nid = id.replace(/\\/g, "/");
    if (!THREE_GLOBAL_PACKAGES.some((p) => nid.includes(p))) return null;
    // Only inject if THREE is actually referenced in this specific file
    if (!/\bTHREE\b/.test(code)) return null;
    // Skip if the file already provides THREE via import or require
    if (
      code.includes("from 'three'") ||
      code.includes('from "three"') ||
      code.includes("require('three')") ||
      code.includes('require("three")')
    ) return null;
    return {
      code: `import * as THREE from 'three';\n${code}`,
      map: null,
    };
  },
};

export default defineConfig({
  plugins: [
    threeWebgpuShim,
    engineIoGlobalsShim,
    injectThreeForKnownPackages,
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      // three/webgpu was added in r167+; our pinned v0.160 doesn't have it.
      // Alias to stub module that exports dummy WebGPURenderer + re-exports three.
      "three/webgpu": path.resolve(import.meta.dirname, "client/src/lib/three-webgpu-stub.js"),
      "three/tsl": path.resolve(import.meta.dirname, "client/src/lib/three-webgpu-stub.js"),
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "client/dist"),
    emptyOutDir: true,
    copyPublicDir: true,
    commonjsOptions: {
      // Allow packages that use THREE as a global to resolve it
      transformMixedEsModules: true,
    },
    rollupOptions: {
      plugins: [
        {
          // Intercept three/webgpu and three/tsl at the Rollup resolver level.
          // The [commonjs--resolver] fires before Vite plugins, so we need
          // a Rollup-level plugin here to catch it in time.
          name: "rollup-three-webgpu-shim",
          resolveId(id: string) {
            if (id === "three/webgpu" || id === "three/tsl") {
              return {
                id: path.resolve(import.meta.dirname, "client/src/lib/three-webgpu-stub.js"),
                external: false,
              };
            }
            return null;
          },
        },
      ],
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: { global: "globalThis" },
    },
  },
  define: {
    // Expose PvP server URL to the client bundle (set in .env.local or CI)
    // Fallback to localhost:4321 for local development
    "import.meta.env.VITE_PVP_SERVER_URL": JSON.stringify(
      process.env.VITE_PVP_SERVER_URL || "http://localhost:4321"
    ),
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      // R2 asset CDN — forward directly to Cloudflare R2 (must come before /api catch-all)
      "/api/assets": {
        target: "https://assets.grudge-studio.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/assets/, ""),
      },
      // All other /api calls → local Express server (port 5000).
      // In production, Vercel rewrites handle this via GRUDGE_API_URL.
      // NEVER proxy to api.grudge-studio.com in dev — that bypasses local routes.
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: false,
        secure: false,
      },
    },
  },
});
