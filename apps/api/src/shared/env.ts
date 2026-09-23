import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Loads the `.env` file into `process.env`, from the API folder or from the
 * repository root, whichever exists first.
 *
 * Every entrypoint needs it, not only the server: a script started with `tsx`
 * gets no environment at all, so without this call a perfectly configured
 * `.env` looks like missing credentials.
 */
export function loadEnvironmentFiles(cwd: string = process.cwd()): void {
  const candidates = [resolve(cwd, ".env"), resolve(cwd, "../../.env")];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      process.loadEnvFile(candidate);
      return;
    }
  }
}
