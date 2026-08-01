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

// three@0.185+ ships three/webgpu + three/tsl — resolve from package exports (no stub).

/** Auth/fleet scripts live in client/public; Vercel build uses repo-root publicDir. */
const CLIENT_AUTH_PUBLIC_FILES = [
  "grudge-game-bootstrap.js",
  "grudge-fleet.js",
  "grudge-auth-modal.js",
  "grudge-auth-modal.css",
  "js/grudge-render-capabilities.js",
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
    copyClientAuthPublic,
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: [
      ...grudgeAliases,
      { find: "@shared", replacement: path.resolve(__dir, "..", "shared") },
      { find: "@assets", replacement: path.resolve(__dir, "..", "attached_assets") },
      {
        find: "@tailwindcss/typography",
        replacement: path.resolve(repoRoot, "node_modules/@tailwindcss/typography"),
      },
    ],
    extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"],
    dedupe: ["react", "react-dom", "three"],
  },
  define: {
    __GRUDGE_ASSET_BASE_DEFAULT__: JSON.stringify("https://assets.grudge-studio.com"),
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: __dir,
  build: {
    outDir: path.resolve(__dir, "dist"),
    emptyOutDir: true,
    copyPublicDir: false,
    chunkSizeWarningLimit: 2500,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      // Optional peer for pinata shatter (hide-chunk works without it)
      external: ["@dgreenheck/three-pinata"],
      // three@0.185 exports WebGPURenderer via three/webgpu — keep shim soft for edge packages
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
          // Split WebGPU entry so default play path stays lighter
          if (norm.includes("three.webgpu") || norm.includes("/renderers/webgpu/")) {
            return "three-webgpu";
          }
          // Vendor splits — keep main index under control
          if (norm.includes("node_modules/three/") || norm.includes("node_modules/three\\")) {
            return "three-vendor";
          }
          if (
            norm.includes("node_modules/three-stdlib") ||
            norm.includes("node_modules/@types/three") ||
            norm.includes("/examples/jsm/")
          ) {
            return "three-extras";
          }
          if (
            norm.includes("node_modules/react-dom") ||
            norm.includes("node_modules/react/") ||
            norm.includes("node_modules/scheduler") ||
            norm.includes("node_modules/wouter")
          ) {
            return "react-vendor";
          }
          if (norm.includes("node_modules/@tanstack") || norm.includes("node_modules/@radix-ui")) {
            return "ui-vendor";
          }
          // Heavy game surfaces — load with their routes
          if (norm.includes("/island3d/intro/")) return "cinema-intro";
          if (norm.includes("/island3d/airship/")) return "airship-zone";
          if (norm.includes("/island3d/")) return "island3d";
          if (norm.includes("/game/sailing/") || norm.includes("/game/ocean/")) return "sailing";
          return undefined;
        },
      },
    },
  },
  optimizeDeps: {
    include: ["three", "three/webgpu", "three/tsl"],
  },
  server: {
    fs: {
      allow: monorepoRoot ? [repoRoot, monorepoRoot] : [repoRoot],
    },
    // Don't chokidar-watch huge cinema GLBs (EBUSY crash on Windows)
    watch: {
      ignored: [
        "**/public/models/cinema/**",
        "**/client/public/models/cinema/**",
        "**/*.glb",
        "**/*.GLB",
      ],
    },
    // Match production Vercel rewrites — same-origin /api/assets + /icons + /models
    // Prefer LOCAL public files first (cinema pack: leviathan, startingfalls, fluid…)
    proxy: {
      "/api/assets": {
        target: "https://assets.grudge-studio.com",
        changeOrigin: true,
        rewrite: (p: string) => p.replace(/^\/api\/assets/, ""),
      },
      "/icons": {
        target: "https://assets.grudge-studio.com",
        changeOrigin: true,
        bypass(req: { url?: string }) {
          const rel = (req.url || "").split("?")[0];
          const local = path.resolve(repoRoot, "public", rel.replace(/^\//, ""));
          if (fs.existsSync(local) && fs.statSync(local).isFile()) return rel;
        },
      },
      "/models": {
        target: "https://assets.grudge-studio.com",
        changeOrigin: true,
        bypass(req: { url?: string }) {
          const rel = (req.url || "").split("?")[0];
          const local = path.resolve(repoRoot, "public", rel.replace(/^\//, ""));
          if (fs.existsSync(local) && fs.statSync(local).isFile()) return rel;
        },
      },
      "/sprites": {
        target: "https://assets.grudge-studio.com",
        changeOrigin: true,
      },
    },
  },
});