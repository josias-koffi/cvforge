import type { JobMatchesService } from "./job-matches.service";
import { DEFAULT_MAX_AGE_DAYS } from "./matching/job-matching";
import { readOfferPlace, type OfferSearchPlace } from "./offer-place";

/** Contracts a candidate can filter their own search by. */
export const jobContractFilters = [
  "cdi",
  "cdd",
  "interim",
  "freelance",
  "stage",
  "alternance",
  "vie",
  "unknown",
] as const;

const PUBLISHED_WITHIN_DAYS = [1, 3, 7];
export const OFFER_SEARCH_PAGE_SIZE = 20;
const MAX_QUERY_CHARS = 120;

/** The `/offres` search as its URL carries it (also what the MCP tool takes). */
export type OfferSearchQuery = {
  q?: string;
  departement?: string;
  ville?: string;
  rayon?: string;
  contrat?: string;
  teletravail?: string;
  publiee?: string;
  tri?: string;
  page?: string;
};

type OfferSearchFilters = Parameters<JobMatchesService["searchOffers"]>[1];

export function readOfferSearchQuery(query: OfferSearchQuery): {
  filters: OfferSearchFilters;
  page: number;
  place: OfferSearchPlace | null;
} {
  const page = readPage(query.page);
  const around = readOfferPlace(query.ville, query.rayon);

  return {
    filters: {
      contractTypes: readContracts(query.contrat),
      departments: readDepartments(query.departement),
      limit: OFFER_SEARCH_PAGE_SIZE,
      maxAgeDays: readPublishedWithin(query.publiee),
      near: around?.near,
      offset: (page - 1) * OFFER_SEARCH_PAGE_SIZE,
      query: (query.q ?? "").slice(0, MAX_QUERY_CHARS),
      remoteOnly: query.teletravail === "1" || query.teletravail === "true",
      sort: query.tri === "recent" ? "recent" : "relevance",
    },
    page,
    // The city as the page shows it back: the URL only holds its code.
    place: around?.place ?? null,
  };
}

/** "44,75" — departments as the commune picker writes them. */
function readDepartments(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toUpperCase())
    .filter((entry) => /^(\d{2}|2[AB]|\d{3})$/.test(entry))
    .slice(0, 10);
}

function readContracts(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) =>
      (jobContractFilters as readonly string[]).includes(entry),
    ) as Array<(typeof jobContractFilters)[number]>;
}

function readPage(value: string | undefined): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 50) : 1;
}

/** "Publiée depuis" (US-167): 1, 3 or 7 days; anything else, the whole month. */
function readPublishedWithin(value: string | undefined): number {
  const days = Number(value);

  return PUBLISHED_WITHIN_DAYS.includes(days) ? days : DEFAULT_MAX_AGE_DAYS;
}
