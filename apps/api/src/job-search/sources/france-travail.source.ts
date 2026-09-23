import { Logger } from "@nestjs/common";
import type {
  JobSourceAdapter,
  JobSourceQuery,
  NormalizedJobListing,
} from "../job-search.types";
import {
  FRANCE_TRAVAIL_API_URL,
  FRANCE_TRAVAIL_MAX_RANGE_START,
  FRANCE_TRAVAIL_PAGE_SIZE,
  FRANCE_TRAVAIL_SCOPE,
  FRANCE_TRAVAIL_TOKEN_TTL_MS,
  FRANCE_TRAVAIL_TOKEN_URL,
  type FranceTravailConfig,
} from "./france-travail.config";
import {
  toNormalizedListing,
  type FranceTravailOffer,
} from "./france-travail.mapper";
import { toFranceTravailParams } from "./france-travail.query";
import { readRetryAfterMs, SourceRateLimiter } from "./source-rate-limiter";

type FetchLike = typeof globalThis.fetch;

interface SearchResponse {
  resultats?: FranceTravailOffer[];
}

/** A token is refreshed a minute early, so a call never starts on a dead one. */
const TOKEN_SAFETY_MARGIN_MS = 60_000;
const DEFAULT_PAUSE_MS = 2_000;
/** A page is retried once; the collection runs again tomorrow either way. */
const MAX_ATTEMPTS_PER_PAGE = 2;

/**
 * The France Travail "Offres d'emploi v2" source.
 *
 * Reads offers once a day, per grouped query, and never on a page view: the
 * quota is a few calls a second for the whole product (ADR-023).
 */
export class FranceTravailSource implements JobSourceAdapter {
  readonly source = "france_travail" as const;
  private readonly logger = new Logger(FranceTravailSource.name);
  private readonly limiter: SourceRateLimiter;
  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly config: FranceTravailConfig,
    private readonly fetchImpl: FetchLike = globalThis.fetch,
    private readonly now: () => number = Date.now,
    limiter?: SourceRateLimiter,
  ) {
    this.limiter =
      limiter ??
      new SourceRateLimiter({ requestsPerSecond: config.requestsPerSecond });
  }

  /**
   * Every offer matching the query, paginated.
   *
   * A search is capped at 1 150 results by the API. Reaching that cap means
   * the query was too broad — the caller splits it by commune — so it is
   * logged rather than silently truncated.
   */
  async search(query: JobSourceQuery): Promise<NormalizedJobListing[]> {
    if (!this.config.enabled) return [];

    const listings: NormalizedJobListing[] = [];

    for (
      let start = 0;
      start <= FRANCE_TRAVAIL_MAX_RANGE_START;
      start += FRANCE_TRAVAIL_PAGE_SIZE
    ) {
      const range = `${start}-${start + FRANCE_TRAVAIL_PAGE_SIZE - 1}`;
      const page = await this.fetchPage(query, range);

      // A page that could not be read ends the pagination and keeps what was
      // collected — it is a failure, not the 1150-result ceiling below.
      if (page === null) return listings;

      listings.push(...page);

      if (page.length < FRANCE_TRAVAIL_PAGE_SIZE) return listings;
    }

    this.logger.warn(
      `Query "${query.keywords}" (${query.department || "France"}) hit the 1150-result ceiling; split it by commune.`,
    );

    return listings;
  }

  /**
   * `null` when we cannot tell — a network error or a throttle must never be
   * read as "the offer is gone", which would drop a live offer from the
   * candidate's selection.
   */
  async isStillOpen(externalId: string): Promise<boolean | null> {
    if (!this.config.enabled) return null;

    try {
      const response = await this.request(
        `${FRANCE_TRAVAIL_API_URL}/${encodeURIComponent(externalId)}`,
      );

      if (response.status === 204 || response.status === 404) return false;
      if (response.ok) return true;

      return null;
    } catch (error) {
      this.logger.warn(`Could not check offer ${externalId}: ${String(error)}`);
      return null;
    }
  }

  /** One page, or `null` when the page could not be read. */
  private async fetchPage(
    query: JobSourceQuery,
    range: string,
  ): Promise<NormalizedJobListing[] | null> {
    const params = toFranceTravailParams(query, range);
    const url = new URL(`${FRANCE_TRAVAIL_API_URL}/search`);

    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_PAGE; attempt += 1) {
      try {
        const response = await this.request(url.toString());

        // 204: no offer at all. 206: a partial page, which is the normal
        // answer to a range — both are successes.
        if (response.status === 204) return [];

        if (response.ok || response.status === 206) {
          const payload = (await response.json()) as SearchResponse;

          return (payload.resultats ?? [])
            .map(toNormalizedListing)
            .filter((listing): listing is NormalizedJobListing => listing !== null);
        }

        if (response.status === 429 || response.status >= 500) {
          this.pauseFrom(response);
          continue;
        }

        this.logger.warn(
          `France Travail answered ${response.status} for range ${range}.`,
        );
        return null;
      } catch (error) {
        this.logger.warn(`France Travail request failed: ${String(error)}`);
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

  private async request(url: string): Promise<Response> {
    const token = await this.accessToken();

    return this.limiter.run(() =>
      this.fetchImpl(url, {
        headers: { accept: "application/json", authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(this.config.timeoutMs),
      }),
    );
  }

  /** Cached in memory: the token lives an hour and is shared by every query. */
  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > this.now()) return this.token.value;

    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: "client_credentials",
      scope: FRANCE_TRAVAIL_SCOPE,
    });
    const response = await this.limiter.run(() =>
      this.fetchImpl(FRANCE_TRAVAIL_TOKEN_URL, {
        body,
        headers: { "content-type": "application/x-www-form-urlencoded" },
        method: "POST",
        signal: AbortSignal.timeout(this.config.timeoutMs),
      }),
    );

    if (!response.ok) {
      // Their body names the cause (invalid_client, invalid_scope…); without
      // it a bad secret and an unsubscribed API look exactly the same.
      const detail = (await response.text().catch(() => "")).slice(0, 200);

      throw new Error(
        `France Travail refused the credentials (${response.status}). ${detail}`.trim(),
      );
    }

    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };

    if (!payload.access_token) {
      throw new Error("France Travail returned no access token.");
    }

    // A response without `expires_in` would otherwise expire the token on the
    // spot and re-authenticate before every single call.
    const lifetimeMs = payload.expires_in
      ? payload.expires_in * 1000
      : FRANCE_TRAVAIL_TOKEN_TTL_MS;
    this.token = {
      expiresAt: this.now() + Math.max(0, lifetimeMs - TOKEN_SAFETY_MARGIN_MS),
      value: payload.access_token,
    };

    return this.token.value;
  }
}
