import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "path";
import type { Plugin } from "vite";
import {
  tryResolveGrudgeMonorepoRoot,
  grudgeGameAliasEntries,
} from "./client/vite/grudgeGameIntegration";

const repoRoot = import.meta.dirname;
const clientDir = path.resolve(repoRoot, "client");
const monorepoRoot = tryResolveGrudgeMonorepoRoot(repoRoot);
const grudgeAliases = grudgeGameAliasEntries(repoRoot, clientDir);

/** Serve cinema GLB/HTML from disk so new files never fall through to SPA index.html. */
const serveCinemaFromDisk: Plugin = {
  name: "serve-cinema-glb-from-disk",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const raw = (req.url || "").split("?")[0];
      // cinema packs + grudge6 modular bakes staged under client/public
      if (
        !raw.startsWith("/models/cinema/") &&
        !raw.startsWith("/models/grudge6/") &&
        !raw.startsWith("/cinema/")
      ) {
        return next();
      }
      if (!/\.(glb|gltf|json|html|png|jpg|webp|js)$/i.test(raw)) return next();
      const strip = decodeURIComponent(raw.replace(/^\//, ""));
      const candidates = [
        path.resolve(repoRoot, "client", "public", strip),
        path.resolve(repoRoot, "public", strip),
      ];
      for (const file of candidates) {
        try {
          if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
          const ext = path.extname(file).toLowerCase();
          const type =
            ext === ".glb"
              ? "model/gltf-binary"
              : ext === ".gltf"
                ? "model/gltf+json"
                : ext === ".json"
                  ? "application/json"
                  : ext === ".html"
                    ? "text/html; charset=utf-8"
                    : "application/octet-stream";
          res.setHeader("Content-Type", type);
          res.setHeader("Cache-Control", "no-store");
          fs.createReadStream(file).pipe(res);
          return;
        } catch {
          /* try next */
        }
      }
      next();
    });
  },
};

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
//
// three@0.185+ ships real three/webgpu + three/tsl — do NOT stub them.
// Resolve from package exports (node_modules/three/build/three.webgpu.js).

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
    serveCinemaFromDisk,
    engineIoGlobalsShim,
    injectThreeForKnownPackages,
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: [
      ...grudgeAliases,
      { find: "@shared", replacement: path.resolve(repoRoot, "shared") },
      { find: "@assets", replacement: path.resolve(repoRoot, "attached_assets") },
      // Package main points at missing file → browser TextEncoder/Decoder stub
      {
        find: "text-encoding-utf-8",
        replacement: path.resolve(repoRoot, "client/src/lib/text-encoding-utf-8-stub.js"),
      },
    ],
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    dedupe: ["react", "react-dom"],
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
    // Pre-cleaned in script/build.ts; public copied via script/copy-public-to-dist.mjs.
    emptyOutDir: false,
    copyPublicDir: false,
    // Do not modulepreload Rapier/island3d/sailing on the landing HTML.
    // Those chunks blocked first paint on grudgewarlords.com (empty #root).
    modulePreload: {
      resolveDependencies(_filename, deps) {
        return deps.filter(
          (d) =>
            !/rapier|island3d|sailing|ship-boarding|cinema-intro|tactical-ocean|r3f-vendor|three-app/.test(
              d,
            ),
        );
      },
    },
    commonjsOptions: {
      // Allow packages that use THREE as a global to resolve it
      transformMixedEsModules: true,
    },
    rollupOptions: {
      // three/webgpu + three/tsl resolve via package exports (three@0.185+)
    },
  },
  optimizeDeps: {
    // Only scan the SPA entry — public/*.html multi-pages + broken vendor trees
    // crash vite:dep-scan (missing @radix-ui dist, duplicate symbols in vendor/).
    entries: ["index.html"],
    // Broken/incomplete packages that crash vite:dep-pre-bundle on Windows
    exclude: ["text-encoding-utf-8", "borsh"],
    // Pre-bundle real WebGPU entry so force-graph / optional paths resolve
    include: ["three", "three/webgpu", "three/tsl"],
    esbuildOptions: {
      define: { global: "globalThis" },
    },
  },
  define: {
    // Expose world server URL to the client bundle (set in .env.local or CI)
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
      allow: monorepoRoot ? [repoRoot, monorepoRoot] : [repoRoot],
    },
    // Broken/stale build trees crash chokidar lstat on Windows (root is client/)
    watch: {
      ignored: [
        "**/dist/**",
        "**/dist._bak*/**",
        "**/node_modules/**",
        "**/.git/**",
        "**/*.png",
        "**/*.jpg",
        "**/*.webp",
        "**/*.glb",
        "**/*.fbx",
      ],
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
