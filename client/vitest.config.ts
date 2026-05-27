import { defineConfig } from "vitest/config";
import path from "path";

const __dir = import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dir, "src"),
      "@shared": path.resolve(__dir, "..", "shared"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
