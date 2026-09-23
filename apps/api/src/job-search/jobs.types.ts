import type { SearchContractType } from "@cvforge/types";
import type { JobSource, NormalizedJobListing } from "./job-search.types";
import type { MatchCandidate, MatchMethod } from "./dedup/match-job";

/** One offer as the candidate sees it, with every source that publishes it. */
export interface StoredJob {
  id: string;
  title: string;
  titleKey: string;
  companyName: string;
  companyKey: string;
  companyAnonymous: boolean;
  department: string;
  locationLabel: string;
  latitude: number | null;
  longitude: number | null;
  remote: boolean;
  contractType: SearchContractType | "unknown";
  salaryLabel: string;
  description: string;
  descriptionSimhash: string;
  primaryUrl: string;
  publishedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  closedAt: string | null;
}

export interface StoredJobListing {
  id: string;
  jobId: string;
  source: JobSource;
  externalId: string;
  url: string;
  applyUrl: string;
  title: string;
  companyName: string;
  publishedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  closedAt: string | null;
  matchMethod: MatchMethod | "new" | "manual";
}

/** A job with all of its adverts, which is what a card shows. */
export interface JobWithListings {
  job: StoredJob;
  listings: StoredJobListing[];
}

/** What a candidate can narrow their own search by. */
export interface JobSearchFilters {
  /** Words looked for in the title and the advert. */
  query: string;
  departments: readonly string[];
  contractTypes: readonly (SearchContractType | "unknown")[];
  remoteOnly: boolean;
  /** Offers first collected in the last N days. */
  maxAgeDays: number;
  limit: number;
  offset: number;
}

export const JOBS_STORE = Symbol("JOBS_STORE");

export type JobsStore = {
  /** The jobs the fuzzy step may compare an advert against. */
  findMatchCandidates(input: {
    companyKey: string;
    department: string;
    companyAnonymous: boolean;
    since: string;
  }): Promise<MatchCandidate[]>;
  /** The job any of these links already points to. */
  findJobByLinks(urlKeys: readonly string[]): Promise<string | null>;
  findListing(
    source: JobSource,
    externalId: string,
  ): Promise<StoredJobListing | null>;
  createJob(listing: NormalizedJobListing): Promise<StoredJob>;
  /** Writes the advert, and folds it into the job's canonical fields. */
  attachListing(input: {
    jobId: string;
    listing: NormalizedJobListing;
    matchMethod: MatchMethod | "new" | "manual";
  }): Promise<StoredJobListing>;
  addLinks(jobId: string, urlKeys: readonly string[]): Promise<number>;
  findById(jobId: string): Promise<JobWithListings | null>;
  /**
   * The open jobs a search could match: in one of its departments, or remote.
   * Scoring then happens in memory — it depends on the candidate, and asking
   * Postgres the same question per candidate would buy nothing.
   */
  findOpenJobs(input: {
    departments: readonly string[];
    includeRemote: boolean;
    since: string;
    limit: number;
  }): Promise<StoredJob[]>;
  /**
   * Free search over the offers we hold, for a candidate looking by hand
   * rather than waiting for the morning selection.
   */
  searchJobs(filters: JobSearchFilters): Promise<{
    jobs: StoredJob[];
    total: number;
    /**
     * How many offers the base holds at all, criteria aside. It tells "your
     * search matched nothing" apart from "we have nothing yet" — two very
     * different things to say to a candidate.
     */
    available: number;
  }>;
  /** Closes the advert, and the job once its last advert is closed. */
  closeListing(source: JobSource, externalId: string, at: string): Promise<void>;
  /** Closes every advert of a source not seen in the run that just ended. */
  closeListingsMissingFrom(input: {
    source: JobSource;
    seenExternalIds: readonly string[];
    at: string;
  }): Promise<number>;
  /** Pulls an advert out of a job it was wrongly merged into. */
  detachListing(listingId: string): Promise<StoredJob | null>;
  listRecentFuzzyMatches(limit: number): Promise<JobWithListings[]>;
};
