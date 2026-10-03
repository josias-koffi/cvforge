import type { JobDeduplicator } from "./dedup/job-deduplicator";
import type { JobSource, NormalizedJobListing } from "./job-search.types";
import type { JobsStore } from "./jobs.types";

const DAY_MS = 86_400_000;
/** Past 30 days nothing is proposed: no need to keep those in step. */
const RESYNC_WINDOW_DAYS = 31;
/**
 * At 8 calls a second, about 40 minutes. Past it, the oldest wait for the
 * next day and the run says so: with only matching offers stored (ADR-027 §4)
 * it should never be reached.
 */
export const RESYNC_MAX_PER_RUN = 20_000;

export interface RefreshableSource {
  readonly source: JobSource;
  refresh(
    externalId: string,
  ): Promise<
    | { kind: "open"; listing: NormalizedJobListing }
    | { kind: "closed" }
    | { kind: "unknown" }
  >;
}

export interface ResyncStats {
  checked: number;
  updated: number;
  closed: number;
  unknown: number;
  /** True when the cap left adverts for tomorrow. */
  capped: boolean;
}

/**
 * Keeps the stored France Travail adverts in step with France Travail, at
 * least once every 24 hours: the licence forbids showing an offer as it no
 * longer is (US-163, ADR-027 « Licence »).
 *
 * The stream reads creations only. An advert the daily pass found again was
 * seen today and needs nothing; the others are asked for one by one. A closed
 * one is closed here, so it leaves the app and every alert not sent yet; a
 * changed one is rewritten with its current content. An advert we could not
 * ask about stays as it is: "unknown" is not "gone".
 */
export async function resyncStaleListings(deps: {
  source: RefreshableSource;
  jobs: Pick<JobsStore, "listStaleOpenListings" | "closeListing">;
  deduplicator: Pick<JobDeduplicator, "attach">;
  now: () => number;
  limit?: number;
}): Promise<ResyncStats> {
  const now = deps.now();
  const limit = deps.limit ?? RESYNC_MAX_PER_RUN;
  const stale = await deps.jobs.listStaleOpenListings({
    limit,
    publishedSince: new Date(now - RESYNC_WINDOW_DAYS * DAY_MS).toISOString(),
    seenBefore: new Date(now - DAY_MS).toISOString(),
    source: deps.source.source,
  });
  const stats: ResyncStats = {
    capped: stale.length >= limit,
    checked: 0,
    closed: 0,
    unknown: 0,
    updated: 0,
  };

  for (const externalId of stale) {
    const answer = await deps.source.refresh(externalId);
    stats.checked += 1;

    if (answer.kind === "open") {
      await deps.deduplicator.attach(answer.listing);
      stats.updated += 1;
    } else if (answer.kind === "closed") {
      await deps.jobs.closeListing(
        deps.source.source,
        externalId,
        new Date(deps.now()).toISOString(),
      );
      stats.closed += 1;
    } else {
      stats.unknown += 1;
    }
  }

  return stats;
}
