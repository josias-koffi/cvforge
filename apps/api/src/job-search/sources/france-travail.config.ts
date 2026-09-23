export type FranceTravailConfig = {
  clientId: string;
  clientSecret: string;
  /** Empty credentials disable the source instead of failing the boot. */
  enabled: boolean;
  requestsPerSecond: number;
  timeoutMs: number;
};

/**
 * Documented as 3 to 10 calls a second depending on the source consulted. We
 * hold 3 until the real quota of our own application is read on francetravail.io
 * (sprint 025, "To Clarify" #1): being slower than allowed costs a few minutes
 * of collection, being faster costs a ban.
 */
const DEFAULT_REQUESTS_PER_SECOND = 3;
const DEFAULT_TIMEOUT_MS = 15_000;

export const FRANCE_TRAVAIL_TOKEN_URL =
  "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire";
export const FRANCE_TRAVAIL_API_URL =
  "https://api.francetravail.io/partenaire/offresdemploi/v2/offres";
export const FRANCE_TRAVAIL_SCOPE = "api_offresdemploiv2 o2dsoffre";

/** At most 150 offers per call, and the window cannot start past 1000. */
export const FRANCE_TRAVAIL_PAGE_SIZE = 150;
export const FRANCE_TRAVAIL_MAX_RANGE_START = 1000;

export function resolveFranceTravailConfig(
  env: NodeJS.ProcessEnv = process.env,
): FranceTravailConfig {
  const clientId = env.FRANCE_TRAVAIL_CLIENT_ID?.trim() ?? "";
  const clientSecret = env.FRANCE_TRAVAIL_CLIENT_SECRET?.trim() ?? "";
  const parsedRate = Number(env.FRANCE_TRAVAIL_REQUESTS_PER_SECOND);

  return {
    clientId,
    clientSecret,
    enabled: Boolean(clientId && clientSecret),
    requestsPerSecond:
      Number.isFinite(parsedRate) && parsedRate > 0
        ? parsedRate
        : DEFAULT_REQUESTS_PER_SECOND,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
}
