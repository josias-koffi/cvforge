import type { BoardsService } from "./boards.service";
import type {
  JobSourceAdapter,
  NormalizedJobListing,
} from "./job-search.types";
import type { JobSourcesStore } from "./job-sources.types";
import {
  buildSourceQueries,
  type ProjectSearch,
} from "./sources/france-travail.query";

/** The part of a run's statistics the collection writes. */
export interface CollectionStats {
  sourcesSkipped: string[];
  errors: string[];
  boardsRead: number;
  boardsDiscovered: number;
}

/**
 * Reads every source and every company board for what the candidates'
 * searches imply. Split from the morning run (US-124), which kept the
 * schedule, the lock and the selection.
 */
export class JobCollector {
  constructor(
    private readonly sources: readonly JobSourceAdapter[],
    private readonly sourceStates: JobSourcesStore,
    private readonly boards: BoardsService,
  ) {}

  /** Every source, once, for the queries the candidates' searches imply. */
  async collect(
    searches: readonly ProjectSearch[],
    stats: CollectionStats,
    sinceDays: number,
  ): Promise<NormalizedJobListing[]> {
    const listings: NormalizedJobListing[] = [];
    const queries = buildSourceQueries(searches, sinceDays);
    // Read at every run, not at boot: the adapters are built once when the
    // module is constructed, so a switch flipped in the admin would otherwise
    // stay invisible until the next deployment.
    const disabled = await this.sourceStates.listDisabled();

    for (const source of this.sources) {
      if (disabled.has(source.source)) {
        stats.sourcesSkipped.push(source.source);
        continue;
      }

      let collected = 0;
      let failure = "";

      for (const query of queries) {
        try {
          const found = await source.search(query);
          collected += found.length;
          listings.push(...found);
        } catch (error) {
          // One failed query costs its offers, never the whole morning.
          failure = String(error);
          stats.errors.push(`${source.source}: ${failure}`);
        }
      }

      await this.sourceStates.recordRun(source.source, {
        failed: Boolean(failure),
        listingCount: collected,
        status: failure ? failure : "ok",
      });
    }

    try {
      const boards = await this.boards.collect(disabled);
      stats.boardsRead = boards.boardsRead;
      listings.push(...boards.listings);

      for (const [provider, tally] of boards.byProvider) {
        await this.sourceStates.recordRun(provider, {
          failed: tally.failures > 0,
          listingCount: tally.listingCount,
          status: tally.failures > 0 ? `${tally.failures} échec(s)` : "ok",
        });
      }
    } catch (error) {
      stats.errors.push(`boards: ${String(error)}`);
    }

    stats.boardsDiscovered = await this.discoverBoards(listings, stats);

    return listings;
  }

  /**
   * France Travail publishes the advert's original link, which often points at
   * the employer's own recruiting software. Those links cost nothing and grow
   * the registry by themselves — without them it stays empty until an admin
   * fills it by hand.
   *
   * Run after the boards were read, on purpose: a company registered a second
   * ago would be fetched on an unverified token, and a 404 retires it on the
   * spot. It is collected on the next run instead.
   */
  private async discoverBoards(
    listings: readonly NormalizedJobListing[],
    stats: CollectionStats,
  ): Promise<number> {
    // A 31-day backfill carries thousands of links, most of them repeated.
    const urls = new Set<string>();

    for (const listing of listings) {
      for (const url of listing.partnerUrls) urls.add(url);
    }

    try {
      return await this.boards.registerManyFromUrls(
        [...urls],
        "france_travail",
      );
    } catch (error) {
      stats.errors.push(`board discovery: ${String(error)}`);

      return 0;
    }
  }
}
