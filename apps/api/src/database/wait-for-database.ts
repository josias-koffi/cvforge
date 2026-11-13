/**
 * Waits until Postgres accepts connections before the migrations run.
 *
 * A redeploy restarts Postgres and the API together: on 2026-11-13 the API's
 * migration ran one second before Postgres listened (ECONNREFUSED) and the
 * container died once. Only the errors of a database still starting are
 * retried; a wrong password or a missing database fails at once.
 */

/** Node network errors and Postgres 57P03 (cannot_connect_now: starting up). */
const TRANSIENT_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "57P03",
]);

export function isTransientConnectionError(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code;

  return typeof code === "string" && TRANSIENT_CODES.has(code);
}

export type WaitForDatabaseOptions = {
  timeoutMs?: number;
  intervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  log?: (message: string) => void;
};

export async function waitForDatabase(
  ping: () => Promise<unknown>,
  {
    timeoutMs = 120_000,
    intervalMs = 2_000,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now = Date.now,
    log = console.log,
  }: WaitForDatabaseOptions = {},
) {
  const deadline = now() + timeoutMs;

  for (let attempt = 1; ; attempt += 1) {
    try {
      await ping();
      return;
    } catch (error) {
      if (!isTransientConnectionError(error) || now() >= deadline) {
        throw error;
      }

      if (attempt === 1) {
        log(
          `[migrate] database not ready (${(error as { code: string }).code}), waiting up to ${Math.round(timeoutMs / 1000)} s`,
        );
      }

      await sleep(intervalMs);
    }
  }
}
