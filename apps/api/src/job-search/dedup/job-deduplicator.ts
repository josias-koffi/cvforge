import { Injectable, Logger } from "@nestjs/common";
import type { NormalizedJobListing } from "../job-search.types";
import type { JobsStore, StoredJobListing } from "../jobs.types";
import { listingUrlKeys } from "../jobs.pg-store";
import { companyKey, simhash, titleKey } from "./job-keys";
import { matchJob, type MatchMethod } from "./match-job";

/** How far back the fuzzy step looks. Older jobs are past the 30-day rule. */
const CANDIDATE_WINDOW_DAYS = 45;
const MS_PER_DAY = 86_400_000;

export interface AttachResult {
  listing: StoredJobListing;
  jobId: string;
  method: MatchMethod | "new";
  /** True when this advert opened a job rather than joining one. */
  created: boolean;
}

/**
 * Attaches a collected advert to the offer it belongs to.
 *
 * Runs once per advert per collection, so it stays a few indexed reads: the
 * link lookup, then at most a couple of hundred candidates from the same
 * company and department, compared in memory. No Postgres extension, no
 * similarity query over the whole table.
 */
@Injectable()
export class JobDeduplicator {
  private readonly logger = new Logger(JobDeduplicator.name);

  constructor(
    private readonly store: JobsStore,
    private readonly now: () => number = Date.now,
  ) {}

  async attach(listing: NormalizedJobListing): Promise<AttachResult> {
    const urlKeys = listingUrlKeys(listing);

    // An advert we already hold keeps its job, whatever it would match today:
    // re-deciding every morning would move offers between jobs for nothing.
    const known = await this.store.findListing(listing.source, listing.externalId);
    if (known) {
      const refreshed = await this.store.attachListing({
        jobId: known.jobId,
        listing,
        matchMethod: known.matchMethod,
      });
      await this.store.addLinks(known.jobId, urlKeys);

      return {
        created: false,
        jobId: known.jobId,
        listing: refreshed,
        method: known.matchMethod as MatchMethod | "new",
      };
    }

    const byUrl = await this.store.findJobByLinks(urlKeys);
    const subject = {
      companyAnonymous: listing.companyAnonymous,
      companyKey: companyKey(listing.companyName),
      department: listing.department,
      descriptionSimhash: simhash(listing.description),
      publishedAt: listing.publishedAt,
      title: listing.title,
      titleKey: titleKey(listing.title),
    };
    const candidates = byUrl
      ? []
      : await this.store.findMatchCandidates({
          companyAnonymous: subject.companyAnonymous,
          companyKey: subject.companyKey,
          department: subject.department,
          since: new Date(
            this.now() - CANDIDATE_WINDOW_DAYS * MS_PER_DAY,
          ).toISOString(),
        });

    const match = matchJob(subject, candidates, { byUrl });

    if (match) {
      const attached = await this.store.attachListing({
        jobId: match.jobId,
        listing,
        matchMethod: match.method,
      });
      await this.store.addLinks(match.jobId, urlKeys);

      if (match.method === "fuzzy") {
        this.logger.debug(
          `Merged "${listing.title}" (${listing.source}) into ${match.jobId} at ${match.confidence.toFixed(2)}.`,
        );
      }

      return {
        created: false,
        jobId: match.jobId,
        listing: attached,
        method: match.method,
      };
    }

    const job = await this.store.createJob(listing);
    const attached = await this.store.attachListing({
      jobId: job.id,
      listing,
      matchMethod: "new",
    });
    await this.store.addLinks(job.id, urlKeys);

    return { created: true, jobId: job.id, listing: attached, method: "new" };
  }

  /** Attaches a whole collection, one advert at a time. */
  async attachAll(listings: readonly NormalizedJobListing[]): Promise<{
    jobsCreated: number;
    listingsAttached: number;
    fuzzyMerges: number;
  }> {
    let jobsCreated = 0;
    let listingsAttached = 0;
    let fuzzyMerges = 0;

    for (const listing of listings) {
      try {
        const result = await this.attach(listing);
        listingsAttached += 1;
        if (result.created) jobsCreated += 1;
        if (result.method === "fuzzy") fuzzyMerges += 1;
      } catch (error) {
        // One malformed advert must not lose the rest of the collection.
        this.logger.warn(
          `Could not attach ${listing.source}/${listing.externalId}: ${String(error)}`,
        );
      }
    }

    return { fuzzyMerges, jobsCreated, listingsAttached };
  }
}
