import { cpus } from "node:os";
import { defineConfig } from "vitest/config";

/**
 * Twenty-odd suites stand up their own PGlite — a full Postgres compiled to
 * WASM — and replay every migration in `beforeAll`. That costs ~1.5s on an
 * idle machine, but `turbo run test` runs eight packages at once and each
 * vitest defaults to one worker per core, so the API alone could fork twelve
 * of them. The instances then fight for CPU and the hook blew past vitest's
 * 10s default, failing whole suites with "Hook timed out" while every
 * assertion that did run passed.
 *
 * Capping the pool keeps the WASM instances to a handful, and the raised hook
 * timeout leaves headroom for a loaded CI box rather than a fast laptop.
 */
const MAX_FORKS = Math.max(2, Math.min(4, Math.floor(cpus().length / 2)));

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    hookTimeout: 30_000,
    poolOptions: {
      forks: {
        maxForks: MAX_FORKS,
      },
    },
    coverage: {
      include: ["src/**/*.ts"],
      provider: "v8",
      reporter: ["text"],
    },
  },
});
