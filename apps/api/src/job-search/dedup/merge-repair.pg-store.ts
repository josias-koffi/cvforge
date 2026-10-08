import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Database } from "../../database/database.types";
import { jobListings, jobs } from "../../database/schema";
import type { JobsStore } from "../jobs.types";
import {
  readPartnerUrls,
  type FranceTravailOffer,
} from "../sources/france-travail.mapper";
import { listingsToDetach, type RepairListing } from "./merge-repair";

export interface MergeRepairStats {
  jobsChecked: number;
  jobsSplit: number;
  listingsDetached: number;
  /** A few titles of what was (or would be) split off, to read the dry run. */
  examples: Array<{ jobId: string; detached: string[] }>;
  errors: string[];
}

const EXAMPLES = 20;

/**
 * Splits the open jobs whose adverts today's rules would not merge
 * (`merge-repair.ts`). `dryRun` counts and writes nothing.
 */
export async function repairMerges(
  db: Database,
  store: Pick<JobsStore, "detachListing">,
  options: { dryRun: boolean },
): Promise<MergeRepairStats> {
  const stats: MergeRepairStats = {
    errors: [],
    examples: [],
    jobsChecked: 0,
    jobsSplit: 0,
    listingsDetached: 0,
  };

  for (const [jobId, listings] of await findMergedOpenJobs(db)) {
    stats.jobsChecked += 1;
    const detached = listingsToDetach(listings);
    if (detached.length === 0) continue;

    stats.jobsSplit += 1;
    if (stats.examples.length < EXAMPLES) {
      const titles = new Map(
        listings.map((listing) => [listing.id, listing.title]),
      );
      stats.examples.push({
        detached: detached.map((id) => titles.get(id) ?? id),
        jobId,
      });
    }

    for (const listingId of detached) {
      try {
        if (!options.dryRun) await store.detachListing(listingId);
        stats.listingsDetached += 1;
      } catch (error) {
        stats.errors.push(`${listingId}: ${String(error)}`);
      }
    }
  }

  return stats;
}

/** The adverts of every open job that has more than one, by job. */
async function findMergedOpenJobs(
  db: Database,
): Promise<Map<string, RepairListing[]>> {
  const merged = db
    .select({ jobId: jobListings.jobId })
    .from(jobListings)
    .groupBy(jobListings.jobId)
    .having(sql`count(*) > 1`);
  const rows = await db
    .select({ listing: jobListings })
    .from(jobListings)
    .innerJoin(jobs, eq(jobs.id, jobListings.jobId))
    .where(and(isNull(jobs.closedAt), inArray(jobListings.jobId, merged)));

  const byJob = new Map<string, RepairListing[]>();
  for (const { listing } of rows) {
    byJob.set(listing.jobId, [
      ...(byJob.get(listing.jobId) ?? []),
      {
        companyAnonymous: listing.companyAnonymous,
        companyName: listing.companyName,
        department: listing.department,
        description: listing.description,
        firstSeenAt: listing.firstSeenAt.toISOString(),
        id: listing.id,
        matchMethod: listing.matchMethod,
        publishedAt: listing.publishedAt?.toISOString() ?? null,
        title: listing.title,
        urls: [
          listing.url,
          listing.applyUrl,
          // The partner links France Travail publishes, as the collection read them.
          ...(listing.source === "france_travail"
            ? readPartnerUrls((listing.raw ?? {}) as FranceTravailOffer)
            : []),
        ].filter(Boolean),
      },
    ]);
  }

  return byJob;
}
