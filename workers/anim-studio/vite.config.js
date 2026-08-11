import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  publicDir: "public",
  // Do not inherit monorepo Tailwind PostCSS
  css: {
    postcss: "./postcss.config.js",
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          mediapipe: ["@mediapipe/tasks-vision"],
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
  server: {
    port: 5190,
    proxy: {
      "/api": {
        target: "https://anim-ai-worker.grudge.workers.dev",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
