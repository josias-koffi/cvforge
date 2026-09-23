import type { SearchContractType } from "@cvforge/types";
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
import { jobLinks, jobListings, jobs } from "../database/schema";
import {
  companyKey,
  simhash,
  sourcePriority,
  titleKey,
  urlKey,
} from "./dedup/job-keys";
import type { MatchCandidate, MatchMethod } from "./dedup/match-job";
import type { JobSource, NormalizedJobListing } from "./job-search.types";
import type {
  JobSearchFilters,
  JobsStore,
  JobWithListings,
  StoredJob,
  StoredJobListing,
} from "./jobs.types";

type JobRow = typeof jobs.$inferSelect;

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
type ListingRow = typeof jobListings.$inferSelect;

function toJob(row: JobRow): StoredJob {
  return {
    closedAt: row.closedAt?.toISOString() ?? null,
    companyAnonymous: row.companyAnonymous,
    companyKey: row.companyKey,
    companyName: row.companyName,
    contractType: row.contractType as SearchContractType | "unknown",
    department: row.department,
    description: row.description,
    descriptionSimhash: row.descriptionSimhash,
    firstSeenAt: row.firstSeenAt.toISOString(),
    id: row.id,
    lastSeenAt: row.lastSeenAt.toISOString(),
    latitude: row.latitude,
    locationLabel: row.locationLabel,
    longitude: row.longitude,
    primaryUrl: row.primaryUrl,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    remote: row.remote,
    salaryLabel: row.salaryLabel,
    title: row.title,
    titleKey: row.titleKey,
  };
}

function toListing(row: ListingRow): StoredJobListing {
  return {
    applyUrl: row.applyUrl,
    closedAt: row.closedAt?.toISOString() ?? null,
    companyName: row.companyName,
    externalId: row.externalId,
    firstSeenAt: row.firstSeenAt.toISOString(),
    id: row.id,
    jobId: row.jobId,
    lastSeenAt: row.lastSeenAt.toISOString(),
    matchMethod: row.matchMethod as StoredJobListing["matchMethod"],
    publishedAt: row.publishedAt?.toISOString() ?? null,
    source: row.source as JobSource,
    title: row.title,
    url: row.url,
  };
}

/** Every link an advert carries: its page, its application form, its partners. */
export function listingUrlKeys(listing: NormalizedJobListing): string[] {
  const keys = [listing.url, listing.applyUrl, ...listing.partnerUrls]
    .map(urlKey)
    .filter(Boolean);

  return [...new Set(keys)];
}

export class PgJobsStore implements JobsStore {
  constructor(private readonly db: Database) {}

  /**
   * The jobs worth comparing an advert against: same company and department,
   * or — for an advert with no employer named — the anonymous ones. Bounded by
   * date, so the comparison stays a handful of rows even with a full table.
   */
  async findMatchCandidates(input: {
    companyKey: string;
    department: string;
    companyAnonymous: boolean;
    since: string;
  }): Promise<MatchCandidate[]> {
    const rows = await this.db
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

  async findJobByLinks(urlKeys: readonly string[]): Promise<string | null> {
    if (urlKeys.length === 0) return null;

    const [row] = await this.db
      .select({ jobId: jobLinks.jobId })
      .from(jobLinks)
      .where(inArray(jobLinks.urlKey, [...urlKeys]))
      .limit(1);

    return row?.jobId ?? null;
  }

  async findListing(source: JobSource, externalId: string) {
    const [row] = await this.db
      .select()
      .from(jobListings)
      .where(
        and(eq(jobListings.source, source), eq(jobListings.externalId, externalId)),
      )
      .limit(1);

    return row ? toListing(row) : null;
  }

  async createJob(listing: NormalizedJobListing): Promise<StoredJob> {
    const seenAt = new Date();
    const [row] = await this.db
      .insert(jobs)
      .values({
        companyAnonymous: listing.companyAnonymous,
        companyKey: companyKey(listing.companyName),
        companyName: listing.companyName,
        contractType: listing.contractType,
        department: listing.department,
        description: listing.description,
        descriptionSimhash: simhash(listing.description),
        firstSeenAt: seenAt,
        lastSeenAt: seenAt,
        latitude: listing.latitude,
        locationLabel: listing.locationLabel,
        longitude: listing.longitude,
        primaryUrl: listing.applyUrl || listing.url,
        publishedAt: listing.publishedAt ? new Date(listing.publishedAt) : null,
        remote: listing.remote,
        salaryLabel: listing.salaryLabel,
        title: listing.title,
        titleKey: titleKey(listing.title),
      })
      .returning();

    return toJob(row!);
  }

  /**
   * Writes the advert and folds it into the job.
   *
   * The canonical wording only changes for a source that outranks the ones
   * already there; the dates always widen, because the oldest sighting is what
   * the 30-day rule reads.
   */
  async attachListing(input: {
    jobId: string;
    listing: NormalizedJobListing;
    matchMethod: MatchMethod | "new" | "manual";
  }): Promise<StoredJobListing> {
    const { jobId, listing, matchMethod } = input;
    const seenAt = new Date();
    const publishedAt = listing.publishedAt ? new Date(listing.publishedAt) : null;
    const values = {
      applyUrl: listing.applyUrl,
      companyAnonymous: listing.companyAnonymous,
      companyName: listing.companyName,
      contractType: listing.contractType,
      department: listing.department,
      description: listing.description,
      externalId: listing.externalId,
      jobId,
      lastSeenAt: seenAt,
      latitude: listing.latitude,
      locationLabel: listing.locationLabel,
      longitude: listing.longitude,
      matchMethod,
      publishedAt,
      raw: listing.raw,
      remote: listing.remote,
      salaryLabel: listing.salaryLabel,
      source: listing.source,
      title: listing.title,
      url: listing.url,
    };

    const [row] = await this.db
      .insert(jobListings)
      .values({ ...values, firstSeenAt: seenAt })
      .onConflictDoUpdate({
        target: [jobListings.source, jobListings.externalId],
        set: { ...values, closedAt: null },
      })
      .returning();

    await this.foldIntoJob(jobId, listing, seenAt, publishedAt);

    return toListing(row!);
  }

  private async foldIntoJob(
    jobId: string,
    listing: NormalizedJobListing,
    seenAt: Date,
    publishedAt: Date | null,
  ) {
    const [current] = await this.db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);
    if (!current) return;

    const listings = await this.db
      .select({ source: jobListings.source })
      .from(jobListings)
      .where(eq(jobListings.jobId, jobId));
    const bestRank = Math.max(
      ...listings.map((entry) => sourcePriority(entry.source as JobSource)),
      0,
    );
    // `bestRank` already counts this advert, since it was written just above.
    // Equal rank therefore means "nobody better publishes this job", and the
    // freshest wording of that rank wins.
    const takesOver = sourcePriority(listing.source) >= bestRank;

    await this.db
      .update(jobs)
      .set({
        ...(takesOver
          ? {
              companyAnonymous: listing.companyAnonymous,
              companyKey: companyKey(listing.companyName) || current.companyKey,
              companyName: listing.companyName || current.companyName,
              contractType:
                listing.contractType === "unknown"
                  ? current.contractType
                  : listing.contractType,
              department: listing.department || current.department,
              description: listing.description || current.description,
              descriptionSimhash: listing.description
                ? simhash(listing.description)
                : current.descriptionSimhash,
              latitude: listing.latitude ?? current.latitude,
              locationLabel: listing.locationLabel || current.locationLabel,
              longitude: listing.longitude ?? current.longitude,
              primaryUrl: listing.applyUrl || listing.url || current.primaryUrl,
              remote: listing.remote || current.remote,
              salaryLabel: listing.salaryLabel || current.salaryLabel,
              title: listing.title || current.title,
              titleKey: titleKey(listing.title) || current.titleKey,
            }
          : {}),
        closedAt: null,
        firstSeenAt: current.firstSeenAt,
        lastSeenAt: seenAt,
        // The oldest publication date wins: a repost must not look new.
        publishedAt: olderOf(current.publishedAt, publishedAt),
      })
      .where(eq(jobs.id, jobId));
  }

  async addLinks(jobId: string, urlKeys: readonly string[]): Promise<number> {
    const keys = [...new Set(urlKeys.filter(Boolean))];
    if (keys.length === 0) return 0;

    const inserted = await this.db
      .insert(jobLinks)
      .values(keys.map((key) => ({ jobId, urlKey: key })))
      // A link already pointing at another job is left alone: the first claim
      // on a URL is the one that was verified.
      .onConflictDoNothing({ target: jobLinks.urlKey })
      .returning({ urlKey: jobLinks.urlKey });

    return inserted.length;
  }

  async findById(jobId: string): Promise<JobWithListings | null> {
    const [row] = await this.db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!row) return null;

    const listings = await this.db
      .select()
      .from(jobListings)
      .where(eq(jobListings.jobId, jobId))
      .orderBy(desc(jobListings.lastSeenAt));

    return { job: toJob(row), listings: listings.map(toListing) };
  }

  async findOpenJobs(input: {
    departments: readonly string[];
    includeRemote: boolean;
    since: string;
    limit: number;
  }): Promise<StoredJob[]> {
    const departments = [...new Set(input.departments.filter(Boolean))];
    // No department and no remote filter means "anywhere in France", which is
    // what a candidate mobile nationwide asked for.
    const place =
      departments.length === 0
        ? undefined
        : input.includeRemote
          ? or(inArray(jobs.department, departments), eq(jobs.remote, true))
          : inArray(jobs.department, departments);

    const rows = await this.db
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
  async searchJobs(filters: JobSearchFilters) {
    const words = filters.query
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length > 1)
      .slice(0, MAX_SEARCH_WORDS);
    const departments = [...new Set(filters.departments.filter(Boolean))];
    // What the base holds at all: still open, and recent enough to show.
    const available = [
      isNull(jobs.closedAt),
      gte(
        jobs.firstSeenAt,
        new Date(Date.now() - filters.maxAgeDays * MS_PER_DAY),
      ),
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

    const rows = await this.db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(desc(jobs.firstSeenAt))
      .limit(filters.limit)
      .offset(filters.offset);
    const [counted] = await this.db
      .select({ total: count() })
      .from(jobs)
      .where(and(...conditions));
    const [held] = await this.db
      .select({ total: count() })
      .from(jobs)
      .where(and(...available));

    return {
      available: Number(held?.total ?? 0),
      jobs: rows.map(toJob),
      total: Number(counted?.total ?? 0),
    };
  }

  async closeListing(source: JobSource, externalId: string, at: string) {
    const [row] = await this.db
      .update(jobListings)
      .set({ closedAt: new Date(at) })
      .where(
        and(eq(jobListings.source, source), eq(jobListings.externalId, externalId)),
      )
      .returning({ jobId: jobListings.jobId });

    if (row) await this.refreshClosedAt(row.jobId, at);
  }

  async closeListingsMissingFrom(input: {
    source: JobSource;
    seenExternalIds: readonly string[];
    at: string;
  }): Promise<number> {
    const seen = [...new Set(input.seenExternalIds)];
    const closed = await this.db
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
      await this.refreshClosedAt(jobId, input.at);
    }

    return closed.length;
  }

  /** A job is closed only once every one of its adverts is. */
  private async refreshClosedAt(jobId: string, at: string) {
    const open = await this.db
      .select({ id: jobListings.id })
      .from(jobListings)
      .where(and(eq(jobListings.jobId, jobId), isNull(jobListings.closedAt)))
      .limit(1);

    await this.db
      .update(jobs)
      .set({ closedAt: open.length > 0 ? null : new Date(at) })
      .where(eq(jobs.id, jobId));
  }

  /**
   * Moves an advert to a job of its own, for an admin undoing a wrong merge.
   * Its links move with it, or the next collection would merge it straight
   * back.
   */
  async detachListing(listingId: string): Promise<StoredJob | null> {
    const [row] = await this.db
      .select()
      .from(jobListings)
      .where(eq(jobListings.id, listingId))
      .limit(1);
    if (!row) return null;

    const listing = toListing(row);
    const [created] = await this.db
      .insert(jobs)
      .values({
        companyAnonymous: row.companyAnonymous,
        companyKey: companyKey(row.companyName),
        companyName: row.companyName,
        contractType: row.contractType,
        department: row.department,
        description: row.description,
        descriptionSimhash: simhash(row.description),
        firstSeenAt: row.firstSeenAt,
        lastSeenAt: row.lastSeenAt,
        latitude: row.latitude,
        locationLabel: row.locationLabel,
        longitude: row.longitude,
        primaryUrl: row.applyUrl || row.url,
        publishedAt: row.publishedAt,
        remote: row.remote,
        salaryLabel: row.salaryLabel,
        title: row.title,
        titleKey: titleKey(row.title),
      })
      .returning();

    await this.db
      .update(jobListings)
      .set({ jobId: created!.id, matchMethod: "manual" })
      .where(eq(jobListings.id, listingId));

    const keys = [listing.url, listing.applyUrl].map(urlKey).filter(Boolean);
    if (keys.length > 0) {
      await this.db
        .update(jobLinks)
        .set({ jobId: created!.id })
        .where(inArray(jobLinks.urlKey, keys));
    }

    await this.refreshClosedAt(row.jobId, new Date().toISOString());

    return toJob(created!);
  }

  /** What the admin screen reviews: the merges that needed judgement. */
  async listRecentFuzzyMatches(limit: number): Promise<JobWithListings[]> {
    const rows = await this.db
      .select({ jobId: jobListings.jobId })
      .from(jobListings)
      .where(eq(jobListings.matchMethod, "fuzzy"))
      .orderBy(desc(jobListings.firstSeenAt))
      .limit(limit);

    const found: JobWithListings[] = [];
    for (const jobId of new Set(rows.map((row) => row.jobId))) {
      const job = await this.findById(jobId);
      if (job) found.push(job);
    }

    return found;
  }
}

function olderOf(left: Date | null, right: Date | null): Date | null {
  if (!left) return right;
  if (!right) return left;

  return left <= right ? left : right;
}
