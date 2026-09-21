import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**", "tmp/**", ".next/**"],
    coverage: {
      include: ["app/**/*.ts", "components/**/*.tsx", "lib/**/*.ts"],
      provider: "v8",
      reporter: ["text"],
    },
  },
})
