import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Loads the `.env` file into `process.env`, from the API folder or from the
 * repository root, whichever exists first.
 *
 * Every entrypoint needs it, not only the server: a script started with `tsx`
 * gets no environment at all, so without this call a perfectly configured
 * `.env` looks like missing credentials.
 *
 * A variable already set — what a container does — wins over the file, so a
 * stale `.env` left in an image cannot shadow the deployment's own settings.
 *
 * Returns the file it read, or null when the environment comes from elsewhere.
 */
export function loadEnvironmentFiles(cwd: string = process.cwd()): string | null {
  const candidates = [resolve(cwd, ".env"), resolve(cwd, "../../.env")];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      process.loadEnvFile(candidate);

      return candidate;
    }
  }

  return null;
}
