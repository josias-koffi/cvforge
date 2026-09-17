import { resolve } from "node:path";

const DEFAULT_STATE_FILE = resolve(
  process.cwd(),
  ".data",
  "templates-state.json",
);

/** The pre-Postgres JSON store, imported once by `import-legacy-templates.ts`. */
export function resolveLegacyTemplatesStateFile(env: NodeJS.ProcessEnv) {
  return env.TEMPLATES_STATE_FILE?.trim() || DEFAULT_STATE_FILE;
}
