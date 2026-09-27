export type LaBonneAlternanceConfig = {
  apiKey: string;
  /** An empty key disables the source instead of failing the boot. */
  enabled: boolean;
  requestsPerSecond: number;
  timeoutMs: number;
};

/**
 * The quota the API documents: **60 calls per minute per consumer**, read from
 * the live OpenAPI description rather than from memory.
 *
 * One call a second, so a day's queries never come close — and a burst cannot
 * get the key throttled for everybody.
 */
const DEFAULT_REQUESTS_PER_SECOND = 1;
const DEFAULT_TIMEOUT_MS = 15_000;

export const LA_BONNE_ALTERNANCE_API_URL =
  "https://api.apprentissage.beta.gouv.fr/api";

/**
 * How long a department's answer is reused inside one collection.
 *
 * The API has no keyword search: two candidates looking for different jobs in
 * the same department produce the *same* call. Without this, a run with twenty
 * queries in Loire-Atlantique would ask twenty times for one answer.
 */
export const LA_BONNE_ALTERNANCE_CACHE_MS = 10 * 60_000;

export function resolveLaBonneAlternanceConfig(
  env: NodeJS.ProcessEnv = process.env,
): LaBonneAlternanceConfig {
  const apiKey = env.LA_BONNE_ALTERNANCE_API_KEY?.trim() ?? "";
  const parsedRate = Number(env.LA_BONNE_ALTERNANCE_REQUESTS_PER_SECOND);

  return {
    apiKey,
    enabled: Boolean(apiKey),
    requestsPerSecond:
      Number.isFinite(parsedRate) && parsedRate > 0
        ? parsedRate
        : DEFAULT_REQUESTS_PER_SECOND,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
}
