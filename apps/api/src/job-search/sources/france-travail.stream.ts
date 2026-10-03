import type { FtHttpClient } from "../../france-travail/ft-http.client";
import type { NormalizedJobListing } from "../job-search.types";
import {
  toNormalizedListing,
  type FranceTravailOffer,
} from "./france-travail.mapper";
import {
  FRANCE_TRAVAIL_MAX_RANGE_START,
  FRANCE_TRAVAIL_PAGE_SIZE,
} from "./france-travail.source";

/** What one search can return at most: ranges 0-149 up to 1000-1149. */
export const FRANCE_TRAVAIL_SEARCH_CEILING =
  FRANCE_TRAVAIL_MAX_RANGE_START + FRANCE_TRAVAIL_PAGE_SIZE;

/** Below a second, `minCreationDate` cannot tell two slices apart. */
const MIN_SLICE_MS = 1_000;

interface SearchResponse {
  resultats?: FranceTravailOffer[];
}

/**
 * A slice read in full, or the reason it could not be. Nothing in between:
 * a slice read in part must not move the cursor, or the rest is lost for good.
 */
export type StreamSliceResult =
  | { kind: "ok"; listings: NormalizedJobListing[]; calls: number }
  | {
      kind: "failed";
      reason: string;
      throttled: boolean;
      retryAfterMs: number | null;
    };

class SliceFailure extends Error {
  constructor(
    readonly reason: string,
    readonly throttled: boolean,
    readonly retryAfterMs: number | null,
  ) {
    super(reason);
  }
}

/**
 * Reads every offer France Travail created within a time slice, France
 * entière, without keyword nor department (ADR-027).
 *
 * A search stops at 1 150 results. When the first page announces more
 * (`Content-Range: offres 0-149/3000`), the slice is cut in two and each half
 * read the same way, until every half fits. At the peak a five-minute slice
 * holds a few hundred offers: the cut only happens on a catch-up.
 */
export class FranceTravailStreamReader {
  constructor(private readonly client: FtHttpClient) {}

  isEnabled(): boolean {
    return this.client.isEnabled("offres");
  }

  async read(from: Date, to: Date): Promise<StreamSliceResult> {
    const counter = { calls: 0 };

    try {
      const listings = await this.readSlice(from, to, counter);
      // Two halves share their boundary second: one copy of each offer.
      const unique = new Map(
        listings.map((listing) => [listing.externalId, listing]),
      );

      return { calls: counter.calls, kind: "ok", listings: [...unique.values()] };
    } catch (error) {
      if (!(error instanceof SliceFailure)) throw error;

      return {
        kind: "failed",
        reason: error.reason,
        retryAfterMs: error.retryAfterMs,
        throttled: error.throttled,
      };
    }
  }

  private async readSlice(
    from: Date,
    to: Date,
    counter: { calls: number },
  ): Promise<NormalizedJobListing[]> {
    const first = await this.fetchPage(from, to, 0, counter);

    if (first.total > FRANCE_TRAVAIL_SEARCH_CEILING) {
      const span = to.getTime() - from.getTime();

      if (span > MIN_SLICE_MS) {
        // Whole seconds: the API reads the dates to the second, and a cut
        // inside one would read that second twice or not at all.
        const middle = new Date(
          from.getTime() + Math.floor(span / 2 / 1_000) * 1_000,
        );

        return [
          ...(await this.readSlice(from, middle, counter)),
          ...(await this.readSlice(middle, to, counter)),
        ];
      }
      // One second with more than 1 150 offers has never been seen; read what
      // the API gives rather than loop on it.
    }

    const listings = [...first.listings];
    const total = Math.min(first.total, FRANCE_TRAVAIL_SEARCH_CEILING);

    for (
      let start = FRANCE_TRAVAIL_PAGE_SIZE;
      start < total;
      start += FRANCE_TRAVAIL_PAGE_SIZE
    ) {
      const page = await this.fetchPage(from, to, start, counter);
      listings.push(...page.listings);
    }

    return listings;
  }

  private async fetchPage(
    from: Date,
    to: Date,
    start: number,
    counter: { calls: number },
  ): Promise<{ listings: NormalizedJobListing[]; total: number }> {
    counter.calls += 1;
    const result = await this.client.request<SearchResponse>("offres", {
      path: "/offres/search",
      query: {
        maxCreationDate: toSecondIso(to),
        minCreationDate: toSecondIso(from),
        range: `${start}-${start + FRANCE_TRAVAIL_PAGE_SIZE - 1}`,
      },
    });

    // 204: nothing was created in that slice.
    if (result.kind === "empty") return { listings: [], total: 0 };

    if (result.kind === "unavailable") {
      throw new SliceFailure(
        `${result.reason} ${result.status ?? "no answer"} ${result.detail}`.trim(),
        result.reason === "throttled",
        result.retryAfterMs ?? null,
      );
    }

    const offers = result.data.resultats ?? [];

    return {
      listings: offers
        .map(toNormalizedListing)
        .filter((listing): listing is NormalizedJobListing => listing !== null),
      // Without the header, a full page is all we know: keep paging.
      total:
        readTotal(result.contentRange) ??
        (offers.length === FRANCE_TRAVAIL_PAGE_SIZE
          ? FRANCE_TRAVAIL_SEARCH_CEILING
          : start + offers.length),
    };
  }
}

/** `offres 0-149/3000` → 3000. `null` when the header is missing or unreadable. */
export function readTotal(contentRange: string | null | undefined): number | null {
  const match = /\/(\d+)\s*$/.exec(contentRange ?? "");

  return match ? Number(match[1]) : null;
}

/** ISO-8601 to the second, as the API reads it: `2026-09-28T09:32:33Z`. */
export function toSecondIso(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}
