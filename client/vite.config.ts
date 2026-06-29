import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import type { Plugin } from "vite";
import {
  resolveGrudgeMonorepoRoot,
  grudgeGameAliases,
  grudgeAtAliasEntry,
  grudgeGameManualChunk,
} from "./vite/grudgeGameIntegration";

// Resolve __dirname for ESM compatibility (Node 22+ on Vercel)
const __dir = import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname);
const repoRoot = path.resolve(__dir, "..");
const monorepoRoot = resolveGrudgeMonorepoRoot(repoRoot);

/**
 * Client-only Vite config — used by `npm run build:client` (Vercel deploy).
 * Must mirror the resolve aliases and shims from the root vite.config.ts.
 */

// three/webgpu doesn't exist in v0.160 — shim it at the Rollup level
const threeWebgpuShim: Plugin = {
  name: "three-webgpu-shim",
  enforce: "pre",
  resolveId(id: string) {
    if (id === "three/webgpu" || id === "three/tsl") {
      return { id: "three", external: false };
    }
    return null;
  },
};

export default defineConfig({
  // Use repo-root public/ so skill-tree.html, icons-src/, etc. are included in builds
  publicDir: path.resolve(__dir, "..", "public"),
  plugins: [
    threeWebgpuShim,
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: [
      grudgeAtAliasEntry(__dir, monorepoRoot),
      { find: "@shared", replacement: path.resolve(__dir, "..", "shared") },
      { find: "@assets", replacement: path.resolve(__dir, "..", "attached_assets") },
      { find: "three/webgpu", replacement: "three" },
      ...Object.entries(grudgeGameAliases(monorepoRoot)).map(([find, replacement]) => ({
        find,
        replacement,
      })),
    ],
    extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"],
    dedupe: ["react", "react-dom"],
  },
  define: {
    __GRUDGE_ASSET_BASE_DEFAULT__: JSON.stringify("https://assets.grudge-studio.com"),
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 2500,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      // three-render-objects imports Timer, WebGPURenderer etc. from three.js
      // that don't exist in v0.160. shimMissingExports creates undefined stubs
      // so the build doesn't crash. These code paths are never reached at runtime
      // (force-graph VR branch only).
      shimMissingExports: true,
      onwarn(warning, warn) {
        if (warning.code === "MISSING_EXPORT" && warning.exporter?.includes("three")) return;
        if (warning.code === "SHIMMED_EXPORT") return;
        warn(warning);
      },
      output: {
        manualChunks(id) {
          const norm = id.replace(/\\/g, "/");
          const worldChunk = grudgeGameManualChunk(norm);
          if (worldChunk) return worldChunk;
          if (norm.includes("/artifacts/grudge-game/")) return "grudge-world";
          return undefined;
        },
      },
      plugins: [
        {
          name: "rollup-three-webgpu-shim",
          resolveId(id: string) {
            if (id === "three/webgpu" || id === "three/tsl") {
              return { id: "three", external: false };
            }
            return null;
          },
        },
      ],
    },
  },
  server: {
    fs: {
      allow: [repoRoot, monorepoRoot],
    },
  },
});