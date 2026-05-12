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
];

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
    injectThreeForKnownPackages,
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
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
  },
  optimizeDeps: {
    esbuildOptions: {
      define: { global: "globalThis" },
    },
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      // R2 asset CDN (must come before catch-all /api)
      "/api/assets": {
        target: "https://assets.grudge-studio.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/assets/, ""),
      },
      // All other API calls → Railway backend (behind Cloudflare)
      "/api": {
        target: "https://api.grudge-studio.com",
        changeOrigin: true,
      },
    },
  },
});
