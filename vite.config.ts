import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [
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
  build: {
    outDir: path.resolve(import.meta.dirname, "client/dist"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      // Local dev: proxy /api calls to canonical backends
      // Must match vercel.json rewrites so dev ≡ prod
      "/api/auth": {
        target: "https://id.grudge-studio.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/auth/, "/auth"),
      },
      "/api/account": {
        target: "https://id.grudge-studio.com",
        changeOrigin: true,
      },
      "/api/wallet": {
        target: "https://id.grudge-studio.com",
        changeOrigin: true,
      },
      "/api/nfts": {
        target: "https://id.grudge-studio.com",
        changeOrigin: true,
      },
      "/api/island-nfts": {
        target: "https://id.grudge-studio.com",
        changeOrigin: true,
      },
      "/api/game": {
        target: "https://id.grudge-studio.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/game/, "/api"),
      },
      "/api/assets": {
        target: "https://assets.grudge-studio.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/assets/, ""),
      },
      "/api": {
        target: "https://id.grudge-studio.com",
        changeOrigin: true,
      },
    },
  },
});
