import {
  and,
  asc,
  between,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import type { Database } from "../database/database.types";
import {
  JOBS_AGE_SQL,
  JOBS_SEARCH_VECTOR_SQL,
  JOBS_TITLE_VECTOR_SQL,
  jobListings,
  jobs,
} from "../database/schema";
import type { MatchCandidate } from "./dedup/match-job";
import type { JobSearchFilters, JobSearchNear, StoredJob } from "./jobs.types";
import { toJob } from "./jobs.rows";

/**
 * Reading jobs: the deduplicator's candidates, the morning selection's pool
 * and the candidate's own search.
 */

const MS_PER_DAY = 86_400_000;
/** More words than this and the query stops narrowing anything useful. */
const MAX_SEARCH_WORDS = 6;

/** Same folding as the database does, applied to what the candidate typed. */
function foldWord(word: string): string {
  return (
    word
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      // The ligatures NFD leaves alone, folded as `translate()` folds them.
      .replace(/œ/g, "o")
      .replace(/æ/g, "a")
  );
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
 * The words of a search, folded the way the index folds the text, at most
 * `MAX_SEARCH_WORDS`. Anything but letters and digits splits a word: "c++"
 * becomes "c", and tsquery's own operators (`&`, `|`, `!`, `:`, `'`) never
 * reach `to_tsquery` — they are what would make it throw.
 */
function searchWords(query: string): string[] {
  return foldWord(query)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 1)
    .slice(0, MAX_SEARCH_WORDS);
}

/** Every word as a prefix, all of them required: "dev react" → `dev:* & react:*`. */
function prefixQuery(words: readonly string[]) {
  return sql`to_tsquery('simple', ${words.map((word) => `${word}:*`).join(" & ")})`;
}

// Raw SQL, not bound parameters: the planner only uses an expression index
// for the very same expression, and it does not match `$1` against a literal.
const searchVector = sql.raw(`(${JOBS_SEARCH_VECTOR_SQL})`);
const titleVector = sql.raw(JOBS_TITLE_VECTOR_SQL);

/**
 * The age of an offer: the oldest of "published at the source" and "first
 * seen by us", like `ageInDays` in the scoring. Reading `firstSeenAt` alone
 * would date an offer from the day we imported it: a back-fill over a month
 * would make every advert of that month look published today. Indexed as
 * `jobs_open_age_idx`, written the same way.
 */
const publishedOrSeen = sql.raw(JOBS_AGE_SQL);

const EARTH_RADIUS_KM = 6371;
/** Kilometres in a degree of latitude, for the bounding box. */
const KM_PER_DEGREE = 111.32;

/**
 * Within `radiusKm` of a point: a bounding box first, which an index on the
 * coordinates serves, then the exact great-circle distance — the same
 * formula as `haversineKm`. An offer with no coordinates is kept when it is
 * in a department the circle reaches.
 */
function nearCondition(near: JobSearchNear) {
  const latitudeSpan = near.radiusKm / KM_PER_DEGREE;
  const longitudeSpan =
    near.radiusKm /
    (KM_PER_DEGREE * Math.max(Math.cos((near.latitude * Math.PI) / 180), 0.01));
  const distance = sql`${2 * EARTH_RADIUS_KM} * asin(sqrt(
    power(sin(radians(${jobs.latitude} - ${near.latitude}) / 2), 2)
    + cos(radians(${near.latitude})) * cos(radians(${jobs.latitude}))
    * power(sin(radians(${jobs.longitude} - ${near.longitude}) / 2), 2)
  ))`;
  const measured = and(
    between(
      jobs.latitude,
      near.latitude - latitudeSpan,
      near.latitude + latitudeSpan,
    ),
    between(
      jobs.longitude,
      near.longitude - longitudeSpan,
      near.longitude + longitudeSpan,
    ),
    sql`${distance} <= ${near.radiusKm}`,
  );

  return near.departments.length > 0
    ? or(
        measured,
        and(
          or(isNull(jobs.latitude), isNull(jobs.longitude)),
          inArray(jobs.department, [...near.departments]),
        ),
      )
    : measured;
}

/** What the base holds at all: still open, and recent enough to show. */
function availableConditions(maxAgeDays: number) {
  const cutoff = new Date(Date.now() - maxAgeDays * MS_PER_DAY);

  return [isNull(jobs.closedAt), sql`${publishedOrSeen} >= ${cutoff}`];
}

/**
 * The candidate's own search.
 *
 * A full-text search on the folded title, company and advert
 * (`jobs_search_idx`): every word has to start a word of the offer, so "dev"
 * finds "Développeur". It replaced `like '%word%'` on the whole advert, which
 * read the 1.2 GB table in full — 13 s per search at 500,000 offers.
 */
export async function searchJobs(db: Database, filters: JobSearchFilters) {
  const words = searchWords(filters.query);
  const departments = [...new Set(filters.departments.filter(Boolean))];
  const conditions = [
    ...availableConditions(filters.maxAgeDays),
    ...(words.length > 0
      ? [sql`${searchVector} @@ ${prefixQuery(words)}`]
      : []),
    ...(departments.length > 0
      ? [
          filters.remoteOnly
            ? or(inArray(jobs.department, departments), eq(jobs.remote, true))
            : inArray(jobs.department, departments),
        ]
      : []),
    ...(filters.near
      ? [
          // Remote work is not somewhere else: it fits every city.
          filters.remoteOnly
            ? or(nearCondition(filters.near), eq(jobs.remote, true))
            : nearCondition(filters.near),
        ]
      : []),
    ...(filters.remoteOnly && departments.length === 0 && !filters.near
      ? [eq(jobs.remote, true)]
      : []),
    ...(filters.contractTypes.length > 0
      ? [inArray(jobs.contractType, [...filters.contractTypes])]
      : []),
  ];

  // Relevance: how many of the words the title holds. The title alone is
  // short to read, where ranking on the whole advert would re-read every
  // matching description.
  const titleHits = words.map(
    (word) => sql`(${titleVector} @@ ${prefixQuery([word])})::int`,
  );
  const order =
    filters.sort === "recent"
      ? [desc(publishedOrSeen), desc(jobs.firstSeenAt)]
      : [
          ...(titleHits.length > 0
            ? [desc(sql.join(titleHits, sql` + `))]
            : []),
          desc(jobs.firstSeenAt),
        ];
  const [rows, [counted]] = await Promise.all([
    db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(...order)
      .limit(filters.limit)
      .offset(filters.offset),
    db
      .select({ total: count() })
      .from(jobs)
      .where(and(...conditions)),
  ]);

  return {
    jobs: rows.map(toJob),
    total: Number(counted?.total ?? 0),
  };
}

/**
 * How many offers the base holds at all, criteria aside: it tells "your
 * search matched nothing" apart from "we have nothing yet".
 */
export async function countAvailableJobs(db: Database, maxAgeDays: number) {
  const [held] = await db
    .select({ total: count() })
    .from(jobs)
    .where(and(...availableConditions(maxAgeDays)));

  return Number(held?.total ?? 0);
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
        eq(jobs.department, input.department),
        // A job matches in its own department only (`matchJob`).
        input.companyAnonymous || !input.companyKey
          ? eq(jobs.companyAnonymous, true)
          : eq(jobs.companyKey, input.companyKey),
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

/** Open adverts of a source not seen since `seenBefore`, oldest first (US-163). */
export async function listStaleOpenListings(
  db: Database,
  input: {
    source: string;
    seenBefore: string;
    publishedSince: string;
    limit: number;
  },
): Promise<string[]> {
  const rows = await db
    .select({ externalId: jobListings.externalId })
    .from(jobListings)
    .where(
      and(
        eq(jobListings.source, input.source),
        isNull(jobListings.closedAt),
        lt(jobListings.lastSeenAt, new Date(input.seenBefore)),
        gte(jobListings.firstSeenAt, new Date(input.publishedSince)),
      ),
    )
    .orderBy(asc(jobListings.lastSeenAt))
    .limit(input.limit);

  return rows.map((row) => row.externalId);
}
