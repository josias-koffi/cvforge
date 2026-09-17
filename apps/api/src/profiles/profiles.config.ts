import { resolve } from "node:path";

const DEFAULT_STATE_FILE = resolve(process.cwd(), ".data", "profiles-state.json");

/** The pre-Postgres JSON store, imported once by `import-legacy-profiles.ts`. */
export function resolveLegacyProfilesStateFile(env: NodeJS.ProcessEnv) {
  return env.PROFILES_STATE_FILE?.trim() || DEFAULT_STATE_FILE;
}
