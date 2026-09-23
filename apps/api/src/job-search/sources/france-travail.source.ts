import { Logger } from "@nestjs/common";
import type { FtHttpClient } from "../../france-travail/ft-http.client";
import type {
  JobSourceAdapter,
  JobSourceQuery,
  NormalizedJobListing,
} from "../job-search.types";
import {
  toNormalizedListing,
  type FranceTravailOffer,
} from "./france-travail.mapper";
import { toFranceTravailParams } from "./france-travail.query";

interface SearchResponse {
  resultats?: FranceTravailOffer[];
}

/** At most 150 offers per call, and the window cannot start past 1000. */
export const FRANCE_TRAVAIL_PAGE_SIZE = 150;
export const FRANCE_TRAVAIL_MAX_RANGE_START = 1000;

/**
 * The France Travail "Offres d'emploi v2" source.
 *
 * Reads offers once a day, per grouped query, and never on a page view: the
 * quota is a few calls a second for the whole product (ADR-023). Tokens,
 * pacing and retries belong to the shared client (ADR-024); this class only
 * paginates and maps.
 */
export class FranceTravailSource implements JobSourceAdapter {
  readonly source = "france_travail" as const;
  private readonly logger = new Logger(FranceTravailSource.name);

  constructor(private readonly client: FtHttpClient) {}

  /**
   * Every offer matching the query, paginated.
   *
   * A search is capped at 1 150 results by the API. Reaching that cap means
   * the query was too broad — the caller splits it by commune — so it is
   * logged rather than silently truncated.
   */
  async search(query: JobSourceQuery): Promise<NormalizedJobListing[]> {
    if (!this.client.isEnabled("offres")) return [];

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
    if (!this.client.isEnabled("offres")) return null;

    const result = await this.client.request("offres", {
      attempts: 1,
      path: `/offres/${encodeURIComponent(externalId)}`,
    });

    if (result.kind === "ok") return true;
    if (result.kind === "empty") return false;

    this.logger.warn(
      `Could not check offer ${externalId}: ${result.reason} ${result.detail}`,
    );
    return null;
  }

  /** One page, or `null` when the page could not be read. */
  private async fetchPage(
    query: JobSourceQuery,
    range: string,
  ): Promise<NormalizedJobListing[] | null> {
    const params = toFranceTravailParams(query, range);
    const result = await this.client.request<SearchResponse>("offres", {
      path: "/offres/search",
      query: { ...params },
    });

    if (result.kind === "empty") return [];

    if (result.kind === "unavailable") {
      this.logger.warn(
        `France Travail search failed for range ${range} (${result.reason}, ${result.status ?? "no answer"}) on ${JSON.stringify(params)} — ${result.detail}`,
      );
      return null;
    }

    return (result.data.resultats ?? [])
      .map(toNormalizedListing)
      .filter((listing): listing is NormalizedJobListing => listing !== null);
  }
}
