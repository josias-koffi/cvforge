import {
  APPLICATION_STATUS_DRAFT,
  APPLICATION_STATUS_INTERVIEW_SCHEDULED,
  APPLICATION_STATUS_SENT,
} from "@cvforge/types";
import {
  and,
  count,
  inArray,
  isNotNull,
  isNull,
  lt,
  not,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { Database } from "../database/database.types";
import { jobListings, jobs } from "../database/schema";
import type { JobSource } from "./job-search.types";

/**
 * How long offers are kept, and what is left of them once closed (US-169).
 *
 * The France Travail licence asks that an offer kept after its withdrawal be
 * anonymized (company name, description and site, contact person, phone), and
 * that recruiters' details serve no commercial use (art. 8). An advert loses
 * them as soon as it closes; a job, once every one of its adverts has.
 */

/**
 * What identifies the employer or the recruiter in each source's raw answer,
 * as Postgres JSON paths. A path the answer does not carry is a no-op, so the
 * list errs on the generous side. Lever and Ashby name no company in theirs.
 */
export const IDENTIFYING_RAW_PATHS: Partial<Record<JobSource, string[][]>> = {
  france_travail: [
    ["contact"],
    ["agence"],
    ["entreprise", "nom"],
    ["entreprise", "description"],
    ["entreprise", "url"],
    ["entreprise", "logo"],
  ],
  greenhouse: [["company_name"]],
  la_bonne_alternance: [
    ["workplace", "name"],
    ["workplace", "brand"],
    ["workplace", "legal_name"],
    ["workplace", "website"],
    ["workplace", "siret"],
    ["workplace", "description"],
    ["apply", "phone"],
    ["apply", "email"],
  ],
  smartrecruiters: [["company"]],
};

/** A job an application in one of these states still needs is never purged. */
export const ACTIVE_APPLICATION_STATUSES = [
  APPLICATION_STATUS_DRAFT,
  APPLICATION_STATUS_SENT,
  APPLICATION_STATUS_INTERVIEW_SCHEDULED,
] as const;

/** Deleted per statement: a big first purge must not hold one long lock. */
const PURGE_BATCH_SIZE = 1_000;

export interface AnonymizedCounts {
  listings: number;
  jobs: number;
}

export interface ExpiredCounts {
  /** Jobs past retention that nothing protects. */
  expired: number;
  /** Jobs past retention kept for an active application. */
  keptForApplications: number;
}

export type JobRetentionStore = {
  /** Anonymizes the closed adverts and jobs not done yet, or only these jobs'. */
  anonymizeClosed(jobIds?: readonly string[]): Promise<AnonymizedCounts>;
  /** What `anonymizeClosed` would rewrite, for the dry run. */
  countToAnonymize(): Promise<AnonymizedCounts>;
  /** Deletes the expired jobs; adverts, links and matches go in cascade. */
  purgeExpired(before: string): Promise<number>;
  countExpired(before: string): Promise<ExpiredCounts>;
};

export class PgJobRetentionStore implements JobRetentionStore {
  constructor(private readonly db: Database) {}

  anonymizeClosed(jobIds?: readonly string[]): Promise<AnonymizedCounts> {
    return anonymizeClosed(this.db, jobIds);
  }

  async countToAnonymize(): Promise<AnonymizedCounts> {
    const [listings] = await this.db
      .select({ total: count() })
      .from(jobListings)
      .where(toAnonymize(jobListings));
    const [closedJobs] = await this.db
      .select({ total: count() })
      .from(jobs)
      .where(toAnonymize(jobs));

    return { jobs: closedJobs?.total ?? 0, listings: listings?.total ?? 0 };
  }

  async purgeExpired(before: string): Promise<number> {
    let purged = 0;

    for (;;) {
      const batch = this.db
        .select({ id: jobs.id })
        .from(jobs)
        .where(and(expired(before), not(heldByActiveApplication())))
        .limit(PURGE_BATCH_SIZE);
      const deleted = await this.db
        .delete(jobs)
        .where(inArray(jobs.id, batch))
        .returning({ id: jobs.id });
      purged += deleted.length;

      if (deleted.length < PURGE_BATCH_SIZE) return purged;
    }
  }

  async countExpired(before: string): Promise<ExpiredCounts> {
    const [row] = await this.db
      .select({
        expired: sql<number>`count(*) filter (where not ${heldByActiveApplication()})::int`,
        keptForApplications: sql<number>`count(*) filter (where ${heldByActiveApplication()})::int`,
      })
      .from(jobs)
      .where(expired(before));

    return {
      expired: row?.expired ?? 0,
      keptForApplications: row?.keptForApplications ?? 0,
    };
  }
}

/**
 * Shared with `PgJobsStore`, which calls it the moment a job's adverts close:
 * the daily pass only catches up with what was closed before US-169.
 *
 * Reopening undoes nothing by hand: the source answers again with its full
 * content, which the collection writes back with `anonymized_at` cleared.
 */
export async function anonymizeClosed(
  db: Database,
  jobIds?: readonly string[],
): Promise<AnonymizedCounts> {
  if (jobIds?.length === 0) return { jobs: 0, listings: 0 };

  const now = new Date();
  const listings = await db
    .update(jobListings)
    .set({
      anonymizedAt: now,
      companyAnonymous: true,
      companyName: "",
      raw: strippedRaw(),
    })
    .where(
      and(
        toAnonymize(jobListings),
        jobIds ? inArray(jobListings.jobId, [...jobIds]) : undefined,
      ),
    )
    .returning({ id: jobListings.id });
  // The repost rule loses its company key here: a closed job comes back as
  // new unless one of its links matches. That is the licence's price.
  const closedJobs = await db
    .update(jobs)
    .set({
      anonymizedAt: now,
      companyAnonymous: true,
      companyKey: "",
      companyLogoUrl: "",
      companyName: "",
    })
    .where(
      and(
        toAnonymize(jobs),
        jobIds ? inArray(jobs.id, [...jobIds]) : undefined,
      ),
    )
    .returning({ id: jobs.id });

  return { jobs: closedJobs.length, listings: listings.length };
}

function toAnonymize(table: typeof jobs | typeof jobListings): SQL {
  return and(isNotNull(table.closedAt), isNull(table.anonymizedAt))!;
}

/** `raw` without the paths its source identifies the employer by. */
function strippedRaw(): SQL {
  const cases = Object.entries(IDENTIFYING_RAW_PATHS).map(([source, paths]) => {
    const stripped = paths.reduce<SQL>(
      (value, path) => sql`${value} #- ${`{${path.join(",")}}`}::text[]`,
      sql`${jobListings.raw}`,
    );

    return sql`when ${source} then ${stripped}`;
  });

  return sql`case ${jobListings.source} ${sql.join(cases, sql` `)} else ${jobListings.raw} end`;
}

/**
 * Past the 30-day rule (the same age `ageInDays` reads: the oldest of
 * publication and first sighting), or closed for as long.
 */
function expired(before: string): SQL {
  const cutoff = new Date(before);

  return or(
    sql`least(${jobs.publishedAt}, ${jobs.firstSeenAt}) < ${cutoff}`,
    lt(jobs.closedAt, cutoff),
  )!;
}

function heldByActiveApplication(): SQL {
  const statuses = sql.join(
    ACTIVE_APPLICATION_STATUSES.map((status) => sql`${status}`),
    sql`, `,
  );

  return sql`exists (
    select 1 from job_matches m
    join applications a on a.id = m.application_id
    where m.job_id = ${jobs.id} and a.status in (${statuses})
  )`;
}
