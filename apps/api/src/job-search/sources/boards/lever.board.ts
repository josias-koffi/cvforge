import type { NormalizedJobListing } from "../../job-search.types";
import { classifyContract, normalizeLocation } from "../../job-listing.normalize";
import type { BoardHttpClient } from "./board-http";
import type { CompanyBoardAdapter } from "./board.types";
import { isoDate } from "./greenhouse.board";

/**
 * Lever's public postings API. It serves plain text alongside the HTML, and
 * `categories.commitment` ("Permanent", "Internship") is the contract.
 */
interface LeverPosting {
  id?: string;
  text?: string;
  hostedUrl?: string;
  applyUrl?: string;
  createdAt?: number;
  descriptionPlain?: string;
  additionalPlain?: string;
  workplaceType?: string;
  categories?: {
    commitment?: string;
    department?: string;
    location?: string;
    team?: string;
    allLocations?: string[];
  };
}

export class LeverBoard implements CompanyBoardAdapter {
  readonly provider = "lever" as const;

  constructor(private readonly http: BoardHttpClient) {}

  async fetchBoard(boardToken: string): Promise<NormalizedJobListing[]> {
    const postings = await this.http.getJson<LeverPosting[]>(
      this.provider,
      `https://api.lever.co/v0/postings/${encodeURIComponent(boardToken)}?mode=json`,
    );

    return (Array.isArray(postings) ? postings : [])
      .map((posting) => this.toListing(posting, boardToken))
      .filter((listing): listing is NormalizedJobListing => listing !== null);
  }

  private toListing(
    posting: LeverPosting,
    boardToken: string,
  ): NormalizedJobListing | null {
    const externalId = posting.id?.trim() ?? "";
    const title = posting.text?.trim() ?? "";
    if (!externalId || !title) return null;

    // A posting can list several places; France anywhere in them is enough.
    const candidates = [
      posting.categories?.location ?? "",
      ...(posting.categories?.allLocations ?? []),
    ].filter(Boolean);
    const located = candidates
      .map((candidate) =>
        normalizeLocation(candidate, {
          remoteHint: /remote/i.test(posting.workplaceType ?? ""),
        }),
      )
      .find((entry) => entry.inFrance || entry.remote);

    if (!located) return null;

    const description = [posting.descriptionPlain, posting.additionalPlain]
      .filter(Boolean)
      .join("\n\n")
      .trim();

    return {
      applyUrl: posting.applyUrl?.trim() ?? posting.hostedUrl?.trim() ?? "",
      companyAnonymous: false,
      companyName: boardToken,
      contractType: classifyContract({
        description,
        employmentType: posting.categories?.commitment,
        title,
      }),
      department: located.department,
      description,
      externalId,
      latitude: null,
      locationLabel: located.label,
      longitude: null,
      partnerUrls: [],
      publishedAt: isoDate(posting.createdAt),
      raw: posting,
      remote: located.remote,
      salaryLabel: "",
      source: this.provider,
      title,
      url: posting.hostedUrl?.trim() ?? "",
    };
  }
}
