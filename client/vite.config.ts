import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import type { Plugin } from "vite";

// Resolve __dirname for ESM compatibility (Node 22+ on Vercel)
const __dir = import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname);

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
  plugins: [
    threeWebgpuShim,
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dir, "src"),
      "@shared": path.resolve(__dir, "..", "shared"),
      "@assets": path.resolve(__dir, "..", "attached_assets"),
      "three/webgpu": "three",
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
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
});
