import { defineConfig } from "vitest/config";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

/** Node-only tests for fail-closed auth/mint gates. Does not load the root Vite app config. */
export default defineConfig({
  root,
  test: {
    environment: "node",
    include: ["failClosed*.test.ts", "*.failClosed.test.ts"],
  },
});
