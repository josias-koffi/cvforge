import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      include: ["src/**/*.ts", "src/**/*.tsx"],
      all: true,
      exclude: ["src/**/*.test.*", "src/entrypoints/**"],
      provider: "v8",
      reporter: ["text"],
    },
  },
});
