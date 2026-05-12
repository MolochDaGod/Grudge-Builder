import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import type { Plugin } from "vite";

/**
 * Some node_module packages (e.g. @enable3d/phaser-extension, stage-js,
 * @davi-ai/bodyengine-three) were compiled as UMD and reference THREE as a
 * bare global instead of importing it. Rollup includes their module-level
 * code before main.tsx runs, so window.THREE = THREE is always too late.
 *
 * This plugin runs at the Rollup transform stage: it injects
 * `import * as THREE from 'three'` at the top of any node_module file
 * that references THREE without already importing it.
 */
const injectThreeGlobal: Plugin = {
  name: "inject-three-global",
  enforce: "pre",
  transform(code: string, id: string) {
    // Only target node_modules
    if (!id.includes("node_modules")) return null;
    // Only act if the file references THREE as an identifier
    if (!code.includes("THREE")) return null;
    // Skip if it already imports three
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
    injectThreeGlobal,
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
    // Pre-bundle these UMD/CJS libs that reference THREE as a global
    include: [
      "@enable3d/phaser-extension",
      "@davi-ai/bodyengine-three",
      "stage-js",
    ],
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
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
