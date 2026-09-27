import type { SearchContractType } from "@cvforge/types";
import type { jobListings, jobs } from "../database/schema";
import { companyKey, simhash, titleKey, urlKey } from "./dedup/job-keys";
import type {
  JobSource,
  ListingCompetence,
  NormalizedJobListing,
} from "./job-search.types";
import type { StoredJob, StoredJobListing } from "./jobs.types";

/** Rows of `jobs` and `job_listings`, to and from what the store returns. */

type JobRow = typeof jobs.$inferSelect;
type ListingRow = typeof jobListings.$inferSelect;

export function toJob(row: JobRow): StoredJob {
  return {
    closedAt: row.closedAt?.toISOString() ?? null,
    companyAnonymous: row.companyAnonymous,
    companyKey: row.companyKey,
    companyLogoUrl: row.companyLogoUrl,
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
    romeCode: row.romeCode,
    romeCompetences: row.romeCompetences,
    salaryLabel: row.salaryLabel,
    title: row.title,
    titleKey: row.titleKey,
  };
}

export function toListing(row: ListingRow): StoredJobListing {
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

/** What a new job is made of: an advert, or a stored advert being detached. */
interface JobSeed {
  companyAnonymous: boolean;
  companyLogoUrl?: string;
  companyName: string;
  contractType: string;
  department: string;
  description: string;
  latitude: number | null;
  locationLabel: string;
  longitude: number | null;
  applyUrl: string;
  url: string;
  publishedAt: Date | null;
  remote: boolean;
  salaryLabel: string;
  title: string;
  romeCode: string | null;
  romeCompetences: ListingCompetence[];
}

/** One builder for both ways a job is born, so they cannot drift apart. */
export function newJobValues(
  seed: JobSeed,
  seenAt: { first: Date; last: Date },
) {
  return {
    companyAnonymous: seed.companyAnonymous,
    companyKey: companyKey(seed.companyName),
    companyLogoUrl: seed.companyLogoUrl ?? "",
    companyName: seed.companyName,
    contractType: seed.contractType,
    department: seed.department,
    description: seed.description,
    descriptionSimhash: simhash(seed.description),
    firstSeenAt: seenAt.first,
    lastSeenAt: seenAt.last,
    latitude: seed.latitude,
    locationLabel: seed.locationLabel,
    longitude: seed.longitude,
    primaryUrl: seed.applyUrl || seed.url,
    publishedAt: seed.publishedAt,
    remote: seed.remote,
    romeCode: seed.romeCode,
    romeCompetences: seed.romeCompetences,
    salaryLabel: seed.salaryLabel,
    title: seed.title,
    titleKey: titleKey(seed.title),
  };
}

/** An advert as the seed of a job. */
export function seedFromListing(listing: NormalizedJobListing): JobSeed {
  return {
    ...listing,
    publishedAt: listing.publishedAt ? new Date(listing.publishedAt) : null,
    ...romeColumns(listing),
  };
}

/** The ROME columns of an advert (US-124): empty when the source gave none. */
export function romeColumns(listing: NormalizedJobListing) {
  return {
    romeCode: listing.rome?.code ?? null,
    romeCompetences: listing.rome?.competences ?? [],
  };
}

export function olderOf(left: Date | null, right: Date | null): Date | null {
  if (!left) return right;
  if (!right) return left;

  return left <= right ? left : right;
}
