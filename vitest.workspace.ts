import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "apps/app/vitest.config.ts",
  "apps/landing/vitest.config.ts",
  "apps/api/vitest.config.ts",
  "packages/ui/vitest.config.ts",
  "packages/types/vitest.config.ts",
]);
