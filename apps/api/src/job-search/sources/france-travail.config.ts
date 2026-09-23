export type FranceTravailConfig = {
  clientId: string;
  clientSecret: string;
  /** Empty credentials disable the source instead of failing the boot. */
  enabled: boolean;
  requestsPerSecond: number;
  timeoutMs: number;
};

/**
 * The quota France Travail documents: **4 calls per second per application**
 * (the API itself takes 100, shared between every application).
 *
 * Read from the official documentation rather than from third-party guides,
 * which quote anything between 3 and 10. Past the quota the API answers 429
 * with a `Retry-After`, which the limiter already honours.
 */
const DEFAULT_REQUESTS_PER_SECOND = 4;
const DEFAULT_TIMEOUT_MS = 15_000;

export const FRANCE_TRAVAIL_TOKEN_URL =
  "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire";
export const FRANCE_TRAVAIL_API_URL =
  "https://api.francetravail.io/partenaire/offresdemploi/v2/offres";
export const FRANCE_TRAVAIL_SCOPE = "api_offresdemploiv2 o2dsoffre";

/** An access token lives 25 minutes; it is refreshed a minute early. */
export const FRANCE_TRAVAIL_TOKEN_TTL_MS = 25 * 60_000;

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
