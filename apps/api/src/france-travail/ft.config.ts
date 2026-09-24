/**
 * Every France Travail API CVForge knows how to call, behind one key (ADR-024).
 *
 * Each API has its own OAuth scope and its own quota. `verified: true` means
 * `ft:smoke <api>` got a real answer with this scope, path and payload
 * (2026-09-23 for all but La Bonne Boîte and ROME Substitutions). Quotas outside Offres d'emploi are
 * still unknown. A wrong scope is not an exception here, it is `invalid_scope`
 * at token time — which is why each one can be overridden from the
 * environment without a release.
 */

export const FT_TOKEN_URL =
  "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire";

const FT_API_ROOT = "https://api.francetravail.io/partenaire";

export type FtApiId =
  | "offres"
  | "romeo"
  | "rome-metiers"
  | "rome-competences"
  | "rome-fiches-metiers"
  | "rome-substitutions"
  | "la-bonne-boite";

/** A read-only call `ft:smoke` makes to prove the scope, the path and the payload. */
export interface FtSmokeCall {
  method: "GET" | "POST";
  path: string;
  query?: Record<string, string>;
  body?: unknown;
}

export interface FtApiDefinition {
  label: string;
  baseUrl: string;
  scope: string;
  /** Sustained pace for this API alone; the others have their own limiter. */
  requestsPerSecond: number;
  /** Checked with real calls. `false` means "taken from the catalogue, unproven". */
  verified: boolean;
  smoke: FtSmokeCall;
}

/**
 * Unknown quotas start at one call a second: too slow costs a little time on
 * a nightly job, too fast costs a 429 and a pause for every caller.
 */
const UNKNOWN_QUOTA_RPS = 1;

export const FT_APIS: Record<FtApiId, FtApiDefinition> = {
  offres: {
    label: "Offres d'emploi v2",
    baseUrl: `${FT_API_ROOT}/offresdemploi/v2`,
    scope: "api_offresdemploiv2 o2dsoffre",
    // Documented: 4 calls per second per application (the API takes 100,
    // shared between every application). Past it, a 429 with Retry-After.
    requestsPerSecond: 4,
    verified: true,
    smoke: {
      method: "GET",
      path: "/offres/search",
      query: { motsCles: "développeur", range: "0-4" },
    },
  },
  romeo: {
    label: "ROMEO v2",
    baseUrl: `${FT_API_ROOT}/romeo/v2`,
    scope: "api_romeov2",
    requestsPerSecond: UNKNOWN_QUOTA_RPS,
    verified: true,
    smoke: {
      method: "POST",
      path: "/predictionMetiers",
      // `options.nomAppelant` is mandatory (400 J072000G without it). Several
      // texts go in one call, and `nbResultats` caps the answers per text.
      body: {
        appellations: [
          { identifiant: "1", intitule: "développeur full stack" },
        ],
        options: { nbResultats: 5, nomAppelant: "cvforge" },
      },
    },
  },
  "rome-metiers": {
    label: "ROME 4.0 — Métiers",
    baseUrl: `${FT_API_ROOT}/rome-metiers/v1`,
    scope: "api_rome-metiersv1 nomenclatureRome",
    requestsPerSecond: UNKNOWN_QUOTA_RPS,
    verified: true,
    smoke: { method: "GET", path: "/metiers/metier" },
  },
  "rome-competences": {
    label: "ROME 4.0 — Compétences",
    baseUrl: `${FT_API_ROOT}/rome-competences/v1`,
    scope: "api_rome-competencesv1 nomenclatureRome",
    requestsPerSecond: UNKNOWN_QUOTA_RPS,
    verified: true,
    smoke: { method: "GET", path: "/competences/competence" },
  },
  "rome-fiches-metiers": {
    label: "ROME 4.0 — Fiches métiers",
    baseUrl: `${FT_API_ROOT}/rome-fiches-metiers/v1`,
    scope: "api_rome-fiches-metiersv1 nomenclatureRome",
    requestsPerSecond: UNKNOWN_QUOTA_RPS,
    verified: true,
    smoke: { method: "GET", path: "/fiches-rome/fiche-metier/M1805" },
  },
  // Scopes given by the France Travail support (INC2741452, 2026-09-24). With
  // them the token is issued, yet every call still answers 403
  // `insufficient_scope`: the grant is pending on their side.
  "rome-substitutions": {
    label: "ROME 4.0 — Substitutions",
    baseUrl: `${FT_API_ROOT}/rome-substitutions/v1`,
    scope: "api_rome-substitutionsv1 nomenclatureRomeSubstitutions",
    requestsPerSecond: UNKNOWN_QUOTA_RPS,
    verified: false,
    smoke: { method: "GET", path: "/substitutions" },
  },
  "la-bonne-boite": {
    label: "La Bonne Boîte v2",
    baseUrl: `${FT_API_ROOT}/labonneboite/v2`,
    scope: "api_labonneboitev2 search office",
    requestsPerSecond: UNKNOWN_QUOTA_RPS,
    verified: false,
    smoke: {
      method: "GET",
      path: "/search",
      query: {
        distance: "10",
        latitude: "47.2184",
        longitude: "-1.5536",
        rome_codes: "M1805",
      },
    },
  },
};

export const FT_API_IDS = Object.keys(FT_APIS) as FtApiId[];

/** Without `FRANCE_TRAVAIL_APIS`, only the API proven in production is called. */
const DEFAULT_ENABLED_APIS: readonly FtApiId[] = ["offres"];
const DEFAULT_TIMEOUT_MS = 15_000;

export interface FtResolvedApi extends FtApiDefinition {
  id: FtApiId;
  /** Subscribed on francetravail.io *and* listed in `FRANCE_TRAVAIL_APIS`. */
  enabled: boolean;
}

export interface FtConfig {
  clientId: string;
  clientSecret: string;
  /** Empty credentials make every API inert instead of failing the boot. */
  hasCredentials: boolean;
  timeoutMs: number;
  apis: Record<FtApiId, FtResolvedApi>;
  /** Names in `FRANCE_TRAVAIL_APIS` that match no API: a typo, reported at boot. */
  unknownApis: string[];
}

/**
 * `FRANCE_TRAVAIL_APIS=offres,romeo,rome-metiers` lists what the application
 * is subscribed to. An API left out is never called: an unsubscribed one
 * authenticates fine and then refuses every call, which is how half a day was
 * lost on Offres d'emploi.
 *
 * Per API, `FRANCE_TRAVAIL_<ID>_SCOPE` and `FRANCE_TRAVAIL_<ID>_REQUESTS_PER_SECOND`
 * override the catalogue (`<ID>` in upper case, dashes as underscores).
 * `FRANCE_TRAVAIL_REQUESTS_PER_SECOND` keeps meaning Offres d'emploi, as it
 * did before this layer existed.
 */
export function resolveFtConfig(
  env: NodeJS.ProcessEnv = process.env,
): FtConfig {
  const clientId = env.FRANCE_TRAVAIL_CLIENT_ID?.trim() ?? "";
  const clientSecret = env.FRANCE_TRAVAIL_CLIENT_SECRET?.trim() ?? "";
  const hasCredentials = Boolean(clientId && clientSecret);
  const { listed, unknown } = readApiList(env.FRANCE_TRAVAIL_APIS);

  const apis = Object.fromEntries(
    FT_API_IDS.map((id) => {
      const definition = FT_APIS[id];
      const prefix = `FRANCE_TRAVAIL_${id.toUpperCase().replace(/-/g, "_")}`;
      const rateVariable =
        env[`${prefix}_REQUESTS_PER_SECOND`] ??
        (id === "offres" ? env.FRANCE_TRAVAIL_REQUESTS_PER_SECOND : undefined);

      return [
        id,
        {
          ...definition,
          enabled: hasCredentials && listed.includes(id),
          id,
          requestsPerSecond: positiveNumber(
            rateVariable,
            definition.requestsPerSecond,
          ),
          scope: env[`${prefix}_SCOPE`]?.trim() || definition.scope,
        },
      ];
    }),
  ) as Record<FtApiId, FtResolvedApi>;

  return {
    apis,
    clientId,
    clientSecret,
    hasCredentials,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    unknownApis: unknown,
  };
}

export function isFtApiId(value: string): value is FtApiId {
  return (FT_API_IDS as string[]).includes(value);
}

function readApiList(raw: string | undefined): {
  listed: FtApiId[];
  unknown: string[];
} {
  if (raw === undefined || raw.trim() === "") {
    return { listed: [...DEFAULT_ENABLED_APIS], unknown: [] };
  }

  const names = raw
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);

  return {
    listed: names.filter(isFtApiId),
    unknown: names.filter((name) => !isFtApiId(name)),
  };
}

/** A pace of 0, a negative one or a typo would mean "no limit"; never allow it. */
function positiveNumber(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);

  return raw !== undefined &&
    raw.trim() !== "" &&
    Number.isFinite(parsed) &&
    parsed > 0
    ? parsed
    : fallback;
}
