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
      // Do NOT externalize @dgreenheck/three-pinata — bare specifier in browser
      // throws: Failed to resolve module specifier (breaks client.* /home).
      // Pinata is optional; harvest/damage use debris/hide-chunk without it.
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

          // Shared asset URL helpers — must NOT land in island3d/sailing or
          // sailing→island3d edges recreate the /ocean TDZ cycle.
          if (
            norm.includes("/lib/gameAssetPath") ||
            norm.includes("/lib/assetConfig") ||
            norm.includes("/lib/legacyAssetPaths") ||
            norm.includes("/lib/objectStoreUrl")
          ) {
            return "game-assets";
          }

          // App helpers under src/lib/three — NEVER three-vendor (that matched
          // /three/ and pulled island3d into the Three vendor graph).
          if (norm.includes("/src/lib/three/") || norm.includes("/client/src/lib/three/")) {
            return "three-app";
          }

          // Split WebGPU entry so default play path stays lighter
          if (
            norm.includes("node_modules/three") &&
            (norm.includes("three.webgpu") || norm.includes("/renderers/webgpu/"))
          ) {
            return "three-webgpu";
          }
          // Pure npm three only — never match client/src/lib/three/*
          if (norm.includes("node_modules/three/") || norm.includes("node_modules/three\\")) {
            return "three-vendor";
          }
          if (
            norm.includes("node_modules/three-stdlib") ||
            norm.includes("node_modules/@types/three")
          ) {
            return "three-extras";
          }
          // three/examples/jsm only when resolved from the three package
          if (norm.includes("node_modules/three/examples/jsm/")) {
            return "three-extras";
          }
          // R3F out of pure three-vendor (avoids island3d edge)
          if (
            norm.includes("node_modules/@react-three/") ||
            norm.includes("node_modules/meshline")
          ) {
            return "r3f-vendor";
          }
          /**
           * NEVER split zustand / use-sync-external-store into "state-vendor".
           * That created a circular chunk graph:
           *   react-vendor ⇄ state-vendor
           * which leaves React's export object undefined at runtime:
           *   TypeError: Cannot set properties of undefined (setting 'Activity')
           * (React 19 production factory: G.Activity = …).
           * Keep the entire React state stack in react-vendor.
           */
          if (
            norm.includes("node_modules/react-dom") ||
            norm.includes("node_modules/react/") ||
            norm.includes("node_modules/scheduler") ||
            norm.includes("node_modules/wouter") ||
            norm.includes("node_modules/zustand") ||
            norm.includes("node_modules/use-sync-external-store") ||
            norm.includes("node_modules/react-is")
          ) {
            return "react-vendor";
          }
          if (
            norm.includes("node_modules/@tanstack") ||
            norm.includes("node_modules/@radix-ui") ||
            norm.includes("node_modules/lucide-react") ||
            norm.includes("node_modules/class-variance-authority") ||
            norm.includes("node_modules/clsx") ||
            norm.includes("node_modules/tailwind-merge")
          ) {
            return "ui-vendor";
          }
          // shadcn/ui + cn() — keep out of island3d so ocean/sailing don't import it
          if (
            norm.includes("/components/ui/") ||
            /\/lib\/utils\.(ts|js|mjs)$/.test(norm) ||
            norm.includes("/lib/utils.ts") ||
            norm.includes("/lib/utils.js")
          ) {
            return "ui-vendor";
          }
          // Heavy game surfaces — load with their routes
          if (norm.includes("/island3d/intro/")) return "cinema-intro";
          if (norm.includes("/island3d/airship/")) return "airship-zone";
          if (norm.includes("/island3d/")) return "island3d";
          // Shared ship deck/climb/sails used by lobby dock + open water.
          // Keep OUT of both island3d and full sailing to break init cycles.
          if (
            norm.includes("/game/dock/") ||
            norm.includes("/game/sailing/ShipDeckPhysics") ||
            norm.includes("/game/sailing/OceanBoatClimbRig") ||
            norm.includes("/game/sailing/SailMaterialSystem") ||
            norm.includes("/game/sailing/clothPhysics")
          ) {
            return "ship-boarding";
          }
          // Tactical ocean page UI (own chunk — not mixed into pure sailing sim)
          if (norm.includes("/tactical-ocean/")) return "tactical-ocean";
          if (norm.includes("/pages/ocean")) return "tactical-ocean";
          if (norm.includes("/game/sailing/") || norm.includes("/game/ocean/")) return "sailing";
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
          const strip = rel.replace(/^\//, "");
          // Prefer repo-root public (vite publicDir) then client/public (cinema packs)
          const candidates = [
            path.resolve(repoRoot, "public", strip),
            path.resolve(__dir, "public", strip),
          ];
          for (const local of candidates) {
            try {
              if (fs.existsSync(local) && fs.statSync(local).isFile()) {
                // false = do not proxy; let Vite static middleware serve the local file
                return false;
              }
            } catch {
              /* continue */
            }
          }
        },
      },
      "/sprites": {
        target: "https://assets.grudge-studio.com",
        changeOrigin: true,
      },
    },
  },
});