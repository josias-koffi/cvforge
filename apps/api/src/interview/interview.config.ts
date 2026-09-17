import { resolve } from "node:path";

const DEFAULT_STATE_FILE = resolve(
  process.cwd(),
  ".data",
  "interviews-state.json",
);

/** The pre-Postgres JSON store, imported once by `import-legacy-interviews.ts`. */
export function resolveLegacyInterviewStateFile(env: NodeJS.ProcessEnv) {
  return env.INTERVIEW_STATE_FILE?.trim() || DEFAULT_STATE_FILE;
}
