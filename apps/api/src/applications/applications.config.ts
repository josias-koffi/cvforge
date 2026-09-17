import { resolve } from "node:path";

const DEFAULT_STATE_FILE = resolve(
  process.cwd(),
  ".data",
  "applications-state.json",
);

/**
 * The pre-Postgres JSON store, imported once by
 * `import-legacy-applications.ts`.
 */
export function resolveLegacyApplicationsStateFile(env: NodeJS.ProcessEnv) {
  return env.APPLICATIONS_STATE_FILE?.trim() || DEFAULT_STATE_FILE;
}
