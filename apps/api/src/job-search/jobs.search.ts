import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  or,
  sql,
  type AnyColumn,
} from "drizzle-orm";
import type { Database } from "../database/database.types";
import { jobs } from "../database/schema";
import type { MatchCandidate } from "./dedup/match-job";
import type { JobSearchFilters, StoredJob } from "./jobs.types";
import { toJob } from "./jobs.rows";

/**
 * Reading jobs: the deduplicator's candidates, the morning selection's pool
 * and the candidate's own search.
 */

const MS_PER_DAY = 86_400_000;
/** More words than this and the query stops narrowing anything useful. */
const MAX_SEARCH_WORDS = 6;

/**
 * Accents, folded in SQL.
 *
 * `ilike` ignores case but not accents, so a candidate typing "developpeur"
 * found nothing while the table was full of "Développeur". `unaccent()` would
 * mean a Postgres extension — a schema decision — where `translate()` is
 * standard SQL and costs nothing at this volume.
 */
const ACCENTED_CHARS = "àáâãäåçèéêëìíîïñòóôõöùúûüýÿœæ";
const PLAIN_CHARS = "aaaaaaceeeeiiiinooooouuuuyyoa";

function folded(column: AnyColumn) {
  return sql`translate(lower(${column}), ${ACCENTED_CHARS}, ${PLAIN_CHARS})`;
}

/** Same folding as the database does, applied to what the candidate typed. */
function foldWord(word: string): string {
  return word
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export async function findOpenJobs(
  db: Database,
  input: {
    departments: readonly string[];
    includeRemote: boolean;
    since: string;
    limit: number;
  },
): Promise<StoredJob[]> {
  const departments = [...new Set(input.departments.filter(Boolean))];
  // No department and no remote filter means "anywhere in France", which is
  // what a candidate mobile nationwide asked for.
  const place =
    departments.length === 0
      ? undefined
      : input.includeRemote
        ? or(inArray(jobs.department, departments), eq(jobs.remote, true))
        : inArray(jobs.department, departments);

  const rows = await db
    .select()
    .from(jobs)
    .where(
      and(
        isNull(jobs.closedAt),
        gte(jobs.firstSeenAt, new Date(input.since)),
        ...(place ? [place] : []),
      ),
    )
    .orderBy(desc(jobs.firstSeenAt))
    .limit(input.limit);

  return rows.map(toJob);
}

/**
 * The candidate's own search.
 *
 * The words are matched with `ilike` on the title and the advert: this table
 * holds the offers of the last weeks, not a search engine's index, and a
 * full-text index would be a schema decision to take on real volume rather
 * than on a guess.
 */
export async function searchJobs(db: Database, filters: JobSearchFilters) {
  const words = filters.query
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 1)
    .slice(0, MAX_SEARCH_WORDS);
  const departments = [...new Set(filters.departments.filter(Boolean))];
  // What the base holds at all: still open, and recent enough to show.
  //
  // The age is the oldest of "published at the source" and "first seen by
  // us", like `ageInDays` in the scoring. Reading `firstSeenAt` alone would
  // date an offer from the day we imported it: a back-fill over a month
  // would make every advert of that month look published today.
  const cutoff = new Date(Date.now() - filters.maxAgeDays * MS_PER_DAY);
  const available = [
    isNull(jobs.closedAt),
    sql`least(coalesce(${jobs.publishedAt}, ${jobs.firstSeenAt}), ${jobs.firstSeenAt}) >= ${cutoff}`,
  ];
  const conditions = [
    ...available,
    // Every word has to appear somewhere: two words narrow, they do not widen.
    ...words.map((word) => {
      const needle = `%${foldWord(word)}%`;

      return or(
        sql`${folded(jobs.title)} like ${needle}`,
        sql`${folded(jobs.description)} like ${needle}`,
        sql`${folded(jobs.companyName)} like ${needle}`,
      );
    }),
    ...(departments.length > 0
      ? [
          filters.remoteOnly
            ? or(inArray(jobs.department, departments), eq(jobs.remote, true))
            : inArray(jobs.department, departments),
        ]
      : []),
    ...(filters.remoteOnly && departments.length === 0
      ? [eq(jobs.remote, true)]
      : []),
    ...(filters.contractTypes.length > 0
      ? [inArray(jobs.contractType, [...filters.contractTypes])]
      : []),
  ];

  const rows = await db
    .select()
    .from(jobs)
    .where(and(...conditions))
    .orderBy(desc(jobs.firstSeenAt))
    .limit(filters.limit)
    .offset(filters.offset);
  const [counted] = await db
    .select({ total: count() })
    .from(jobs)
    .where(and(...conditions));
  const [held] = await db
    .select({ total: count() })
    .from(jobs)
    .where(and(...available));

  return {
    available: Number(held?.total ?? 0),
    jobs: rows.map(toJob),
    total: Number(counted?.total ?? 0),
  };
}

/**
 * The jobs worth comparing an advert against: same company and department,
 * or — for an advert with no employer named — the anonymous ones. Bounded by
 * date, so the comparison stays a handful of rows even with a full table.
 */
export async function findMatchCandidates(
  db: Database,
  input: {
    companyKey: string;
    department: string;
    companyAnonymous: boolean;
    since: string;
  },
): Promise<MatchCandidate[]> {
  const rows = await db
    .select({
      companyAnonymous: jobs.companyAnonymous,
      companyKey: jobs.companyKey,
      department: jobs.department,
      descriptionSimhash: jobs.descriptionSimhash,
      jobId: jobs.id,
      publishedAt: jobs.publishedAt,
      titleKey: jobs.titleKey,
    })
    .from(jobs)
    .where(
      and(
        isNull(jobs.closedAt),
        gte(jobs.firstSeenAt, new Date(input.since)),
        input.companyAnonymous || !input.companyKey
          ? eq(jobs.companyAnonymous, true)
          : and(
              eq(jobs.companyKey, input.companyKey),
              eq(jobs.department, input.department),
            ),
      ),
    )
    .limit(200);

  return rows.map((row) => ({
    companyAnonymous: row.companyAnonymous,
    companyKey: row.companyKey,
    department: row.department,
    descriptionSimhash: row.descriptionSimhash,
    jobId: row.jobId,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    titleKey: row.titleKey,
  }));
}
