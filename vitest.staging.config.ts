import { defineConfig } from "vitest/config";

export default defineConfig({
  root: ".",
  test: {
    environment: "node",
    include: ["shared/definitions/multiplayerTutorial.test.ts"],
  },
});
