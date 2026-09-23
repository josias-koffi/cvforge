import { Logger } from "@nestjs/common";
import type {
  JobSourceAdapter,
  JobSourceQuery,
  NormalizedJobListing,
} from "../job-search.types";
import {
  LA_BONNE_ALTERNANCE_API_URL,
  LA_BONNE_ALTERNANCE_CACHE_MS,
  type LaBonneAlternanceConfig,
} from "./la-bonne-alternance.config";
import {
  ACTIVE_STATUS,
  PARTNER_ID_PREFIX,
  toNormalizedListing,
  type LaBonneAlternanceOffer,
} from "./la-bonne-alternance.mapper";
import {
  cacheKeyFor,
  toLaBonneAlternanceParams,
} from "./la-bonne-alternance.query";
import { readRetryAfterMs, SourceRateLimiter } from "./source-rate-limiter";

type FetchLike = typeof globalThis.fetch;

interface SearchResponse {
  jobs?: LaBonneAlternanceOffer[];
  /** Companies likely to hire — a different subject, see sprint-026. */
  recruiters?: unknown[];
  warnings?: Array<{ code?: string; message?: string }>;
}

const DEFAULT_PAUSE_MS = 2_000;
/** A call is retried once; the collection runs again tomorrow either way. */
const MAX_ATTEMPTS = 2;

/**
 * The "La bonne alternance" source — apprenticeship offers, free, public
 * service (ADR-023).
 *
 * Two things set it apart from France Travail, and shape everything here:
 * it only ever returns alternance contracts, and **it has no keyword search**.
 * So a query that did not ask for an alternance is never sent, and a
 * department's answer is reused by every query that differs only by keywords.
 */
export class LaBonneAlternanceSource implements JobSourceAdapter {
  readonly source = "la_bonne_alternance" as const;
  private readonly logger = new Logger(LaBonneAlternanceSource.name);
  private readonly limiter: SourceRateLimiter;
  private readonly cache = new Map<
    string,
    { listings: NormalizedJobListing[]; expiresAt: number }
  >();

  constructor(
    private readonly config: LaBonneAlternanceConfig,
    private readonly fetchImpl: FetchLike = globalThis.fetch,
    private readonly now: () => number = Date.now,
    limiter?: SourceRateLimiter,
  ) {
    this.limiter =
      limiter ??
      new SourceRateLimiter({ requestsPerSecond: config.requestsPerSecond });
  }

  /**
   * Every apprenticeship in the query's department.
   *
   * Not paginated: the API caps an answer at 150 offers per underlying source
   * and states plainly that the rest cannot be fetched. Asking again would
   * return the same page.
   */
  async search(query: JobSourceQuery): Promise<NormalizedJobListing[]> {
    if (!this.config.enabled) return [];

    const params = toLaBonneAlternanceParams(query);
    if (params === null) return [];

    const key = cacheKeyFor(params);
    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > this.now()) return cached.listings;

    const listings = await this.fetchSearch(params.departements);

    if (listings === null) return [];

    this.cache.set(key, {
      expiresAt: this.now() + LA_BONNE_ALTERNANCE_CACHE_MS,
      listings,
    });

    return listings;
  }

  /**
   * `null` whenever we cannot tell, which is most of the time here.
   *
   * Only offers collected by La bonne alternance itself can be looked up; the
   * ones it relays from France Travail or from a partner carry that partner's
   * id, which this endpoint does not know. Answering `false` for them would
   * drop live offers from candidates' selections.
   */
  async isStillOpen(externalId: string): Promise<boolean | null> {
    if (!this.config.enabled) return null;
    if (externalId.startsWith(PARTNER_ID_PREFIX)) return null;

    try {
      const response = await this.request(
        `${LA_BONNE_ALTERNANCE_API_URL}/job/v1/offer/${encodeURIComponent(externalId)}`,
      );

      if (response.status === 404) return false;
      if (!response.ok) return null;

      const payload = (await response.json()) as LaBonneAlternanceOffer;
      const status = payload.offer?.status;

      // A filled or cancelled offer is still served, so the status is what
      // says whether it is still open — not the 200 itself.
      return status === undefined ? null : status === ACTIVE_STATUS;
    } catch (error) {
      this.logger.warn(`Could not check offer ${externalId}: ${String(error)}`);
      return null;
    }
  }

  /** The offers, or `null` when the call could not be made. */
  private async fetchSearch(
    department: string | undefined,
  ): Promise<NormalizedJobListing[] | null> {
    const url = new URL(`${LA_BONNE_ALTERNANCE_API_URL}/job/v1/search`);

    if (department) url.searchParams.set("departements", department);

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await this.request(url.toString());

        if (response.ok) {
          const payload = (await response.json()) as SearchResponse;

          for (const warning of payload.warnings ?? []) {
            this.logger.warn(
              `La bonne alternance warned ${warning.code}: ${warning.message}`,
            );
          }

          return (payload.jobs ?? [])
            .map(toNormalizedListing)
            .filter((listing): listing is NormalizedJobListing => listing !== null);
        }

        if (response.status === 429 || response.status >= 500) {
          this.pauseFrom(response);
          continue;
        }

        // Their body names the cause — a missing key and a malformed
        // department otherwise look exactly the same.
        const detail = (await response.text().catch(() => "")).slice(0, 300);

        this.logger.warn(
          `La bonne alternance answered ${response.status} on ${url.search} — ${detail}`,
        );
        return null;
      } catch (error) {
        this.logger.warn(`La bonne alternance request failed: ${String(error)}`);
      }
    }

    return null;
  }

  private pauseFrom(response: Response): void {
    const pauseMs = readRetryAfterMs(
      response.headers.get("retry-after"),
      DEFAULT_PAUSE_MS,
      this.now(),
    );
    this.limiter.pauseUntil(this.now() + pauseMs);
  }

  /** A plain bearer key: no token exchange, unlike France Travail. */
  private async request(url: string): Promise<Response> {
    return this.limiter.run(() =>
      this.fetchImpl(url, {
        headers: {
          accept: "application/json",
          authorization: `Bearer ${this.config.apiKey}`,
        },
        signal: AbortSignal.timeout(this.config.timeoutMs),
      }),
    );
  }
}
