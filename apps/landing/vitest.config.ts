import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["app/**/*.test.ts", "app/**/*.test.tsx"],
    coverage: {
      include: ["app/**/*.ts", "app/**/*.tsx", "next.config.ts"],
      provider: "v8",
      reporter: ["text"],
    },
  },
});
