import type { NormalizedJobListing } from "../../job-search.types";
import {
  classifyContract,
  departmentFromPostcode,
  htmlToText,
  normalizeLocation,
} from "../../job-listing.normalize";
import type { BoardHttpClient } from "./board-http";
import type { CompanyBoardAdapter } from "./board.types";
import { isoDate } from "./greenhouse.board";

/**
 * Ashby's public job board API. The richest of the four: it gives a postal
 * address, an employment type, a remote flag and a published date.
 */
interface AshbyJob {
  id?: string;
  title?: string;
  location?: string;
  secondaryLocations?: Array<{ location?: string }>;
  department?: string;
  employmentType?: string;
  isListed?: boolean;
  isRemote?: boolean;
  workplaceType?: string;
  publishedAt?: string;
  jobUrl?: string;
  applyUrl?: string;
  descriptionPlain?: string;
  descriptionHtml?: string;
  compensation?: { compensationTierSummary?: string };
  address?: {
    postalAddress?: {
      addressCountry?: string;
      addressLocality?: string;
      addressRegion?: string;
      postalCode?: string;
    };
  };
}

interface AshbyBoardPayload {
  jobs?: AshbyJob[];
}

export class AshbyBoard implements CompanyBoardAdapter {
  readonly provider = "ashby" as const;

  constructor(private readonly http: BoardHttpClient) {}

  async fetchBoard(boardToken: string): Promise<NormalizedJobListing[]> {
    const board = await this.http.getJson<AshbyBoardPayload>(
      this.provider,
      `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(boardToken)}?includeCompensation=true`,
    );

    return (board.jobs ?? [])
      .map((job) => this.toListing(job, boardToken))
      .filter((listing): listing is NormalizedJobListing => listing !== null);
  }

  private toListing(job: AshbyJob, boardToken: string): NormalizedJobListing | null {
    const externalId = job.id?.trim() ?? "";
    const title = job.title?.trim() ?? "";
    // `isListed: false` is an offer the company has taken off its own board.
    if (!externalId || !title || job.isListed === false) return null;

    const postal = job.address?.postalAddress;
    const located = [job.location ?? "", ...secondaryLocations(job)]
      .filter(Boolean)
      .map((candidate) =>
        normalizeLocation(candidate, {
          countryHint: postal?.addressCountry,
          remoteHint: job.isRemote === true,
        }),
      )
      .find((entry) => entry.inFrance || entry.remote);

    if (!located) return null;

    const description =
      job.descriptionPlain?.trim() || htmlToText(job.descriptionHtml ?? "");
    // The postcode is the reliable department when the city is not in our list.
    const department = located.department || departmentFromPostcode(postal?.postalCode);

    return {
      applyUrl: job.applyUrl?.trim() ?? "",
      companyAnonymous: false,
      companyName: boardToken,
      contractType: classifyContract({
        description,
        employmentType: job.employmentType,
        title,
      }),
      department,
      description,
      externalId,
      latitude: null,
      locationLabel: located.label,
      longitude: null,
      partnerUrls: [],
      publishedAt: isoDate(job.publishedAt),
      raw: job,
      remote: located.remote,
      salaryLabel: job.compensation?.compensationTierSummary?.trim() ?? "",
      source: this.provider,
      title,
      url: job.jobUrl?.trim() ?? "",
    };
  }
}

function secondaryLocations(job: AshbyJob): string[] {
  return (job.secondaryLocations ?? [])
    .map((entry) => entry.location ?? "")
    .filter(Boolean);
}
