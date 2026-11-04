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
 * Recruitee's public offers API (`{company}.recruitee.com/api/offers/`).
 * `employment_type_code` reads like `fulltime_permanent`, `fulltime_fixed_term`
 * or `internship`. `mailbox_email` is the recruiter's inbox: it stays in `raw`
 * only until the offer closes (US-169).
 */
interface RecruiteeLocation {
  name?: string;
  city?: string;
  country?: string;
  country_code?: string;
}

interface RecruiteeOffer {
  id?: number | string;
  status?: string;
  title?: string;
  company_name?: string;
  careers_url?: string;
  careers_apply_url?: string;
  published_at?: string;
  created_at?: string;
  country?: string;
  country_code?: string;
  city?: string;
  location?: string;
  locations?: RecruiteeLocation[];
  remote?: boolean;
  employment_type_code?: string;
  department?: string;
  description?: string;
  requirements?: string;
  salary?: { min?: number | null; max?: number | null; currency?: string | null };
}

interface RecruiteePayload {
  offers?: RecruiteeOffer[];
}

export class RecruiteeBoard implements CompanyBoardAdapter {
  readonly provider = "recruitee" as const;

  constructor(private readonly http: BoardHttpClient) {}

  async fetchBoard(boardToken: string): Promise<NormalizedJobListing[]> {
    const board = await this.http.getJson<RecruiteePayload>(
      this.provider,
      `https://${encodeURIComponent(boardToken)}.recruitee.com/api/offers/`,
    );

    return (board.offers ?? [])
      .map((offer) => this.toListing(offer, boardToken))
      .filter((listing): listing is NormalizedJobListing => listing !== null);
  }

  private toListing(offer: RecruiteeOffer, boardToken: string): NormalizedJobListing | null {
    const externalId = offer.id === undefined ? "" : String(offer.id);
    const title = offer.title?.trim() ?? "";
    if (!externalId || !title || (offer.status && offer.status !== "published")) return null;

    const places: RecruiteeLocation[] = offer.locations?.length
      ? offer.locations
      : [{ city: offer.city, country: offer.country, country_code: offer.country_code, name: offer.location }];
    const located = places
      .map((place) =>
        normalizeLocation(
          place.name || [place.city, place.country].filter(Boolean).join(", "),
          { countryHint: place.country_code ?? place.country, remoteHint: offer.remote === true },
        ),
      )
      .find((entry) => entry.inFrance || entry.remote);

    if (!located) return null;

    const description = [offer.description, offer.requirements]
      .filter(Boolean)
      .map((html) => htmlToText(html ?? ""))
      .join("\n\n")
      .trim();
    const url = offer.careers_url?.trim() ?? "";

    return {
      applyUrl: offer.careers_apply_url?.trim() || url,
      companyAnonymous: false,
      companyName: offer.company_name?.trim() || boardToken,
      contractType: classifyContract({
        description,
        employmentType: offer.employment_type_code?.replace(/_/g, " "),
        title,
      }),
      department: located.department,
      description,
      externalId,
      latitude: null,
      locationLabel: located.label,
      longitude: null,
      partnerUrls: [],
      publishedAt: isoDate(offer.published_at?.replace(" UTC", "Z").replace(" ", "T") ?? offer.created_at),
      raw: offer,
      remote: located.remote,
      salaryLabel: salaryLabel(offer.salary),
      source: this.provider,
      title,
      url,
    };
  }
}

function salaryLabel(salary: RecruiteeOffer["salary"]): string {
  if (!salary?.min && !salary?.max) return "";

  const range = [salary.min, salary.max].filter(Boolean).join(" – ");

  return `${range} ${salary.currency ?? ""}`.trim();
}
