import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "path";
import type { Plugin } from "vite";
import {
  tryResolveGrudgeMonorepoRoot,
  grudgeGameAliasEntries,
  grudgeGameManualChunk,
} from "./vite/grudgeGameIntegration";

// Resolve __dirname for ESM compatibility (Node 22+ on Vercel)
const __dir = import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname);
const repoRoot = path.resolve(__dir, "..");
const monorepoRoot = tryResolveGrudgeMonorepoRoot(repoRoot);
const grudgeAliases = grudgeGameAliasEntries(repoRoot, __dir);

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

/** Auth/fleet scripts live in client/public; Vercel build uses repo-root publicDir. */
const CLIENT_AUTH_PUBLIC_FILES = [
  "grudge-game-bootstrap.js",
  "grudge-fleet.js",
  "grudge-auth-modal.js",
  "grudge-auth-modal.css",
] as const;

const clientPublicDir = path.resolve(__dir, "public");

const copyClientAuthPublic: Plugin = {
  name: "copy-client-auth-public",
  closeBundle() {
    const outDir = path.resolve(__dir, "dist");
    for (const file of CLIENT_AUTH_PUBLIC_FILES) {
      const src = path.join(clientPublicDir, file);
      if (!fs.existsSync(src)) continue;
      const dest = path.join(outDir, file);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
  },
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const pathname = (req.url ?? "").split("?")[0];
      const rel = pathname.startsWith("/") ? pathname.slice(1) : pathname;
      if (!CLIENT_AUTH_PUBLIC_FILES.includes(rel as (typeof CLIENT_AUTH_PUBLIC_FILES)[number])) {
        return next();
      }
      const src = path.join(clientPublicDir, rel);
      if (!fs.existsSync(src)) return next();
      res.setHeader("Content-Type", rel.endsWith(".css") ? "text/css" : "application/javascript");
      res.end(fs.readFileSync(src));
    });
  },
};

export default defineConfig({
  // Use repo-root public/ so skill-tree.html, icons-src/, etc. are included in builds
  publicDir: path.resolve(__dir, "..", "public"),
  plugins: [
    threeWebgpuShim,
    copyClientAuthPublic,
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: [
      ...grudgeAliases,
      { find: "@shared", replacement: path.resolve(__dir, "..", "shared") },
      { find: "@assets", replacement: path.resolve(__dir, "..", "attached_assets") },
      { find: "three/webgpu", replacement: "three" },
      {
        find: "@tailwindcss/typography",
        replacement: path.resolve(repoRoot, "node_modules/@tailwindcss/typography"),
      },
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
      allow: monorepoRoot ? [repoRoot, monorepoRoot] : [repoRoot],
    },
  },
});