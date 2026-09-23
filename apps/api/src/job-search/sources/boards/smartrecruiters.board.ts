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
 * SmartRecruiters' public postings API.
 *
 * The one board that does not give the advert text in its listing: the
 * description needs a second call per posting. Big employers publish hundreds
 * of offers worldwide, so the listing is filtered to France **first** and only
 * the survivors are fetched in full — otherwise a single company would cost
 * hundreds of calls a day for a handful of usable offers.
 */
interface SmartRecruitersPosting {
  id?: string;
  name?: string;
  uuid?: string;
  releasedDate?: string;
  company?: { identifier?: string; name?: string };
  location?: {
    city?: string;
    region?: string;
    country?: string;
    postalCode?: string;
    remote?: boolean;
    fullLocation?: string;
  };
  typeOfEmployment?: { id?: string; label?: string };
  ref?: string;
}

interface SmartRecruitersListing {
  offset?: number;
  limit?: number;
  totalFound?: number;
  content?: SmartRecruitersPosting[];
}

interface SmartRecruitersDetail {
  jobAd?: {
    sections?: Record<string, { title?: string; text?: string } | undefined>;
  };
  applyUrl?: string;
  postingUrl?: string;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 5;
/** Detail calls per company and per run — the cost ceiling of this adapter. */
const MAX_DETAILS = 60;

export class SmartRecruitersBoard implements CompanyBoardAdapter {
  readonly provider = "smartrecruiters" as const;

  constructor(private readonly http: BoardHttpClient) {}

  async fetchBoard(boardToken: string): Promise<NormalizedJobListing[]> {
    const postings = await this.listFrenchPostings(boardToken);
    const listings: NormalizedJobListing[] = [];

    for (const posting of postings.slice(0, MAX_DETAILS)) {
      const listing = await this.toListing(posting, boardToken);
      if (listing) listings.push(listing);
    }

    return listings;
  }

  private async listFrenchPostings(
    boardToken: string,
  ): Promise<SmartRecruitersPosting[]> {
    const kept: SmartRecruitersPosting[] = [];

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const listing = await this.http.getJson<SmartRecruitersListing>(
        this.provider,
        `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(boardToken)}/postings?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`,
      );
      const content = listing.content ?? [];

      for (const posting of content) {
        const located = this.locate(posting);
        if (located.inFrance || located.remote) kept.push(posting);
      }

      if (content.length < PAGE_SIZE) break;
    }

    return kept;
  }

  private locate(posting: SmartRecruitersPosting) {
    return normalizeLocation(
      posting.location?.fullLocation ??
        [posting.location?.city, posting.location?.region]
          .filter(Boolean)
          .join(", "),
      {
        countryHint: posting.location?.country,
        remoteHint: posting.location?.remote === true,
      },
    );
  }

  private async toListing(
    posting: SmartRecruitersPosting,
    boardToken: string,
  ): Promise<NormalizedJobListing | null> {
    const externalId = posting.id?.trim() ?? "";
    const title = posting.name?.trim() ?? "";
    if (!externalId || !title) return null;

    const located = this.locate(posting);
    const detail = await this.readDetail(boardToken, externalId);
    const description = readSections(detail);
    const url =
      detail?.postingUrl?.trim() ||
      `https://careers.smartrecruiters.com/${encodeURIComponent(boardToken)}/${externalId}`;

    return {
      applyUrl: detail?.applyUrl?.trim() ?? url,
      companyAnonymous: false,
      companyName: posting.company?.name?.trim() || boardToken,
      contractType: classifyContract({
        description,
        // The id ("permanent", "intern") is the contract; the label is often
        // "Full-time", which is a working time and says nothing about it.
        employmentType: [
          posting.typeOfEmployment?.id,
          posting.typeOfEmployment?.label,
        ]
          .filter(Boolean)
          .join(" "),
        title,
      }),
      department:
        located.department || departmentFromPostcode(posting.location?.postalCode),
      description,
      externalId,
      latitude: null,
      locationLabel: located.label,
      longitude: null,
      partnerUrls: [],
      publishedAt: isoDate(posting.releasedDate),
      raw: posting,
      remote: located.remote,
      salaryLabel: "",
      source: this.provider,
      title,
      url,
    };
  }

  /** A missing advert text loses the description, not the offer. */
  private async readDetail(
    boardToken: string,
    postingId: string,
  ): Promise<SmartRecruitersDetail | null> {
    try {
      return await this.http.getJson<SmartRecruitersDetail>(
        this.provider,
        `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(boardToken)}/postings/${encodeURIComponent(postingId)}`,
      );
    } catch {
      return null;
    }
  }
}

function readSections(detail: SmartRecruitersDetail | null): string {
  const sections = detail?.jobAd?.sections ?? {};

  return Object.values(sections)
    .map((section) => htmlToText(section?.text ?? ""))
    .filter(Boolean)
    .join("\n\n")
    .trim();
}
