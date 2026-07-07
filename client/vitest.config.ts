import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const __dir = import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dir, "src"),
      "@shared": path.resolve(__dir, "..", "shared"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    root: path.resolve(__dir),
    setupFiles: [path.resolve(__dir, "src/test/setup.ts")],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
