import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/test/suite/**/*.test.ts"],
    environment: "node",
  },
});
