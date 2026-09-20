import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "apps/landing/vitest.config.ts",
  "apps/api/vitest.config.ts",
  "packages/ui/vitest.config.ts",
  "packages/types/vitest.config.ts",
]);
