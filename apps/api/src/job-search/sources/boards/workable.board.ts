import type { NormalizedJobListing } from "../../job-search.types";
import {
  classifyContract,
  htmlToText,
  normalizeLocation,
} from "../../job-listing.normalize";
import type { BoardHttpClient } from "./board-http";
import type { CompanyBoardAdapter } from "./board.types";
import { isoDate } from "./greenhouse.board";

/**
 * Workable's public widget API (`apply.workable.com/api/v1/widget/accounts`).
 * `employment_type` is a working time ("Full-time"), not a contract, so the
 * contract is read from the title and the description instead.
 */
interface WorkableLocation {
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
}

interface WorkableJob {
  title?: string;
  shortcode?: string;
  employment_type?: string;
  telecommuting?: boolean;
  department?: string;
  url?: string;
  shortlink?: string;
  application_url?: string;
  published_on?: string;
  created_at?: string;
  country?: string;
  city?: string;
  state?: string;
  description?: string;
  locations?: WorkableLocation[];
}

interface WorkablePayload {
  name?: string;
  jobs?: WorkableJob[];
}

export class WorkableBoard implements CompanyBoardAdapter {
  readonly provider = "workable" as const;

  constructor(private readonly http: BoardHttpClient) {}

  async fetchBoard(boardToken: string): Promise<NormalizedJobListing[]> {
    const board = await this.http.getJson<WorkablePayload>(
      this.provider,
      `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(boardToken)}?details=true`,
    );
    const companyName = board.name?.trim() || boardToken;

    return (board.jobs ?? [])
      .map((job) => this.toListing(job, companyName))
      .filter((listing): listing is NormalizedJobListing => listing !== null);
  }

  private toListing(job: WorkableJob, companyName: string): NormalizedJobListing | null {
    const externalId = job.shortcode?.trim() ?? "";
    const title = job.title?.trim() ?? "";
    if (!externalId || !title) return null;

    // An offer can list several places; France anywhere in them is enough.
    const places: WorkableLocation[] = job.locations?.length
      ? job.locations
      : [{ city: job.city, country: job.country, region: job.state }];
    const located = places
      .map((place) =>
        normalizeLocation(
          [place.city, place.region, place.country].filter(Boolean).join(", "),
          { countryHint: place.countryCode ?? place.country, remoteHint: job.telecommuting === true },
        ),
      )
      .find((entry) => entry.inFrance || entry.remote);

    if (!located) return null;

    const description = htmlToText(job.description ?? "");
    const url = job.url?.trim() || job.shortlink?.trim() || "";

    return {
      applyUrl: job.application_url?.trim() || url,
      companyAnonymous: false,
      companyName,
      contractType: classifyContract({ description, title }),
      department: located.department,
      description,
      externalId,
      latitude: null,
      locationLabel: located.label,
      longitude: null,
      partnerUrls: [],
      publishedAt: isoDate(job.published_on ?? job.created_at),
      raw: job,
      remote: located.remote,
      salaryLabel: "",
      source: this.provider,
      title,
      url,
    };
  }
}
