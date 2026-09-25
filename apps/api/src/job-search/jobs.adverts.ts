import { desc, getTableColumns, inArray, sql } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { jobListings } from "../database/schema";
import type { JobSource } from "./job-search.types";
import { toListing } from "./jobs.rows";
import type { JobAdverts } from "./jobs.types";
import { readJobDetails } from "./listing-details";

/**
 * The adverts of a page of offers, in one read rather than one per offer.
 * The payload comes without its description: the job already carries the
 * text, and only the structured fields are read from it.
 */
export async function findAdvertsByJobIds(
  db: Database,
  jobIds: readonly string[],
): Promise<Map<string, JobAdverts>> {
  const adverts = new Map<string, JobAdverts>();
  if (jobIds.length === 0) return adverts;

  const rows = await db
    .select({
      ...getTableColumns(jobListings),
      raw: sql<unknown>`${jobListings.raw} - 'description'`,
    })
    .from(jobListings)
    .where(inArray(jobListings.jobId, [...jobIds]))
    .orderBy(desc(jobListings.lastSeenAt));

  const byJob = new Map<string, typeof rows>();
  for (const row of rows)
    byJob.set(row.jobId, [...(byJob.get(row.jobId) ?? []), row]);

  for (const jobId of jobIds) {
    const own = byJob.get(jobId) ?? [];
    adverts.set(jobId, {
      details: readJobDetails(
        own.map((row) => ({ ...row, source: row.source as JobSource })),
      ),
      listings: own.map(toListing),
    });
  }

  return adverts;
}
