import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
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
import {
  newJobValues,
  olderOf,
  romeColumns,
  seedFromListing,
  toJob,
  toListing,
} from "./jobs.rows";
import { findMatchCandidates, findOpenJobs, searchJobs } from "./jobs.search";
import type {
  JobSearchFilters,
  JobsStore,
  JobWithListings,
  StoredJob,
  StoredJobListing,
} from "./jobs.types";

export { listingUrlKeys } from "./jobs.rows";

export class PgJobsStore implements JobsStore {
  constructor(private readonly db: Database) {}

  findMatchCandidates(input: {
    companyKey: string;
    department: string;
    companyAnonymous: boolean;
    since: string;
  }): Promise<MatchCandidate[]> {
    return findMatchCandidates(this.db, input);
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
        and(
          eq(jobListings.source, source),
          eq(jobListings.externalId, externalId),
        ),
      )
      .limit(1);

    return row ? toListing(row) : null;
  }

  async createJob(listing: NormalizedJobListing): Promise<StoredJob> {
    const seenAt = new Date();
    const [row] = await this.db
      .insert(jobs)
      .values(
        newJobValues(seedFromListing(listing), { first: seenAt, last: seenAt }),
      )
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
    const publishedAt = listing.publishedAt
      ? new Date(listing.publishedAt)
      : null;
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
      romeAppellation: listing.rome?.appellationLabel || null,
      ...romeColumns(listing),
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
        // The first advert that named a ROME job keeps it; skills are only
        // replaced by an advert that lists some.
        romeCode: current.romeCode ?? listing.rome?.code ?? null,
        romeCompetences:
          current.romeCompetences.length > 0
            ? current.romeCompetences
            : (listing.rome?.competences ?? []),
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
    const [row] = await this.db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);
    if (!row) return null;

    const listings = await this.db
      .select()
      .from(jobListings)
      .where(eq(jobListings.jobId, jobId))
      .orderBy(desc(jobListings.lastSeenAt));

    return { job: toJob(row), listings: listings.map(toListing) };
  }

  findOpenJobs(input: {
    departments: readonly string[];
    includeRemote: boolean;
    since: string;
    limit: number;
  }): Promise<StoredJob[]> {
    return findOpenJobs(this.db, input);
  }

  searchJobs(filters: JobSearchFilters) {
    return searchJobs(this.db, filters);
  }

  async closeListing(source: JobSource, externalId: string, at: string) {
    const [row] = await this.db
      .update(jobListings)
      .set({ closedAt: new Date(at) })
      .where(
        and(
          eq(jobListings.source, source),
          eq(jobListings.externalId, externalId),
        ),
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
      .values(
        newJobValues(row, { first: row.firstSeenAt, last: row.lastSeenAt }),
      )
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
