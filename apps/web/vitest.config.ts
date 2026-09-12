import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["test/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules"],
    testTimeout: 60_000,
  },
});
