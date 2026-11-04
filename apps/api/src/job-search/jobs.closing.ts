import { and, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
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
 * Marks adverts as seen without rewriting them: the daily reconciliation
 * confirms hundreds of thousands, and an upsert of each would rewrite as many
 * rows of text. Returns the ids we do not hold, which the caller stores.
 */
export async function touchListings(
  db: Database,
  input: { source: JobSource; externalIds: readonly string[]; at: string },
): Promise<string[]> {
  const ids = [...new Set(input.externalIds)];
  if (ids.length === 0) return [];

  const touched = await db
    .update(jobListings)
    .set({ lastSeenAt: new Date(input.at) })
    .where(
      and(
        eq(jobListings.source, input.source),
        inArray(jobListings.externalId, ids),
        isNull(jobListings.closedAt),
      ),
    )
    .returning({ externalId: jobListings.externalId });

  const held = new Set(touched.map((row) => row.externalId));

  return ids.filter((id) => !held.has(id));
}

/**
 * Closes the open adverts of a source created since `createdSince` that a
 * complete walk of that period did not find: France Travail no longer lists
 * them, so they were filled or withdrawn.
 */
export async function closeListingsNotSeenSince(
  db: Database,
  input: {
    source: JobSource;
    seenBefore: string;
    createdSince: string;
    at: string;
  },
): Promise<number> {
  const closed = await db
    .update(jobListings)
    .set({ closedAt: new Date(input.at) })
    .where(
      and(
        eq(jobListings.source, input.source),
        isNull(jobListings.closedAt),
        lt(jobListings.lastSeenAt, new Date(input.seenBefore)),
        gte(jobListings.publishedAt, new Date(input.createdSince)),
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
