import { and, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { jobListings, jobs } from "../database/schema";
import type { JobSource } from "./job-search.types";
import { anonymizeClosed } from "./job-retention.pg-store";

/** Closing adverts, and their job with them (split from `jobs.pg-store.ts`). */

export async function closeListing(
  db: Database,
  input: { source: JobSource; externalId: string; at: string },
): Promise<void> {
  const [row] = await db
    .update(jobListings)
    .set({ closedAt: new Date(input.at) })
    .where(
      and(
        eq(jobListings.source, input.source),
        eq(jobListings.externalId, input.externalId),
      ),
    )
    .returning({ jobId: jobListings.jobId });

  if (row) await refreshClosedAt(db, row.jobId, input.at);
}

export async function closeListingsMissingFrom(
  db: Database,
  input: { source: JobSource; seenExternalIds: readonly string[]; at: string },
): Promise<number> {
  const seen = [...new Set(input.seenExternalIds)];
  const closed = await db
    .update(jobListings)
    .set({ closedAt: new Date(input.at) })
    .where(
      and(
        eq(jobListings.source, input.source),
        isNull(jobListings.closedAt),
        seen.length > 0
          ? sql`${jobListings.externalId} not in ${seen}`
          : sql`true`,
      ),
    )
    .returning({ jobId: jobListings.jobId });

  for (const jobId of new Set(closed.map((row) => row.jobId))) {
    await refreshClosedAt(db, jobId, input.at);
  }

  return closed.length;
}

/**
 * A job is closed only once every one of its adverts is. Every closing goes
 * through here, so it is where a closed advert, and a closed job, lose what
 * identifies the employer (US-169).
 */
export async function refreshClosedAt(
  db: Database,
  jobId: string,
  at: string,
): Promise<void> {
  const open = await db
    .select({ id: jobListings.id })
    .from(jobListings)
    .where(and(eq(jobListings.jobId, jobId), isNull(jobListings.closedAt)))
    .limit(1);

  await db
    .update(jobs)
    .set({ closedAt: open.length > 0 ? null : new Date(at) })
    .where(eq(jobs.id, jobId));
  await anonymizeClosed(db, [jobId]);
}
