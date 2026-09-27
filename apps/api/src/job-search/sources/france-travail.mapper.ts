import type { SearchContractType } from "@cvforge/types";
import { departmentFromPostcode } from "../job-listing.normalize";
import type {
  ListingCompetence,
  ListingRome,
  NormalizedJobListing,
} from "../job-search.types";

/**
 * A France Travail offer, as the fields we read from it. Everything is
 * optional: the payload is a third party's, and half the fields are absent on
 * any given offer.
 */
export interface FranceTravailOffer {
  id?: string;
  intitule?: string;
  description?: string;
  dateCreation?: string;
  dateActualisation?: string;
  typeContrat?: string;
  typeContratLibelle?: string;
  natureContrat?: string;
  alternance?: boolean;
  lieuTravail?: {
    libelle?: string;
    codePostal?: string;
    commune?: string;
    latitude?: number | string;
    longitude?: number | string;
  };
  entreprise?: { nom?: string; entrepriseAdaptee?: boolean; logo?: string };
  salaire?: { libelle?: string; commentaire?: string };
  origineOffre?: {
    urlOrigine?: string;
    partenaires?: Array<{ nom?: string; url?: string; logo?: string }>;
  };
  contact?: { urlPostulation?: string };
  romeCode?: string;
  appellationlibelle?: string;
  competences?: Array<{ code?: string; libelle?: string; exigence?: string }>;
}

/** Wording France Travail uses when the employer stays hidden. */
const ANONYMOUS_MARKERS = ["confidentiel", "anonyme"];

const REMOTE_MARKERS = ["télétravail", "teletravail", "100% remote", "full remote"];

/**
 * `typeContrat` codes, from the API's reference list. An unknown code reads as
 * "unknown" rather than defaulting to CDI: proposing a CDI to somebody who
 * only wants an internship is the mistake that matters here.
 */
const CONTRACT_BY_CODE: Record<string, SearchContractType> = {
  CCE: "cdi",
  CDD: "cdd",
  CDI: "cdi",
  DDI: "cdd",
  LIB: "freelance",
  MIS: "interim",
  SAI: "cdd",
};

/** `natureContrat` codes for the two alternance contracts. */
const APPRENTICESHIP_NATURES = new Set(["E2", "FS"]);

export function toNormalizedListing(
  offer: FranceTravailOffer,
): NormalizedJobListing | null {
  const externalId = text(offer.id);
  const title = text(offer.intitule);
  if (!externalId || !title) return null;

  const companyName = text(offer.entreprise?.nom);
  const description = text(offer.description);
  const locationLabel = text(offer.lieuTravail?.libelle);

  return {
    applyUrl: text(offer.contact?.urlPostulation),
    companyAnonymous: !companyName || isAnonymous(companyName),
    // An anonymous employer's logo would name it all the same.
    companyLogoUrl: isAnonymous(companyName) ? "" : text(offer.entreprise?.logo),
    companyName: isAnonymous(companyName) ? "" : companyName,
    contractType: readContractType(offer),
    department: readDepartment(offer),
    description,
    externalId,
    latitude: coordinate(offer.lieuTravail?.latitude),
    locationLabel,
    longitude: coordinate(offer.lieuTravail?.longitude),
    partnerUrls: readPartnerUrls(offer),
    publishedAt: isoDate(offer.dateCreation),
    raw: offer,
    remote: isRemote(`${title} ${locationLabel} ${description}`),
    ...readRome(offer),
    salaryLabel: text(offer.salaire?.libelle),
    source: "france_travail",
    title,
    url: `https://candidat.francetravail.fr/offres/recherche/detail/${externalId}`,
  };
}

/**
 * An alternance is not a contract *type* at France Travail but a contract
 * *nature*, so the nature and the `alternance` flag are read first: an
 * apprenticeship is also typed CDD or CDI and would otherwise be offered to
 * someone who asked for neither.
 */
export function readContractType(
  offer: FranceTravailOffer,
): SearchContractType | "unknown" {
  const nature = text(offer.natureContrat).toUpperCase();

  if (offer.alternance === true || APPRENTICESHIP_NATURES.has(nature)) {
    return "alternance";
  }

  const code = text(offer.typeContrat).toUpperCase();

  return CONTRACT_BY_CODE[code] ?? "unknown";
}

/**
 * The department, read from the location label France Travail sends
 * ("44 - NANTES"), then from the postcode. Corsica keeps its letter and the
 * overseas departments are three digits.
 */
export function readDepartment(offer: FranceTravailOffer): string {
  // Three digits first (overseas), then Corsica's 2A/2B, then the usual two.
  const labelPrefix = /^\s*(\d{3}|2[AB]|\d{2})\s*-/.exec(
    text(offer.lieuTravail?.libelle),
  );
  if (labelPrefix?.[1]) return normalizeDepartment(labelPrefix[1]);

  // `commune` holds the INSEE code, which shares its first digits with the
  // postcode for this purpose.
  return (
    departmentFromPostcode(text(offer.lieuTravail?.codePostal)) ||
    departmentFromPostcode(text(offer.lieuTravail?.commune))
  );
}

/** "20" covers Corsica in older data; the API's own codes are 2A and 2B. */
function normalizeDepartment(value: string): string {
  return value.toUpperCase();
}

/**
 * The ROME job the offer is filed under. On 2026-09-24 every offer had a code
 * and an appellation label, and a fifth to two fifths of them listed skills,
 * each marked "E" (required) or "S" (wished for).
 */
export function readRome(offer: FranceTravailOffer): { rome?: ListingRome } {
  const code = text(offer.romeCode).toUpperCase();
  if (!code) return {};

  const competences: ListingCompetence[] = (offer.competences ?? []).flatMap(
    (competence) => {
      const competenceCode = text(competence?.code);
      const label = text(competence?.libelle);

      return competenceCode && label
        ? [
            {
              code: competenceCode,
              label,
              required: text(competence?.exigence).toUpperCase() === "E",
            },
          ]
        : [];
    },
  );

  return {
    rome: {
      appellationLabel: text(offer.appellationlibelle),
      code,
      competences,
    },
  };
}

/**
 * Where else the offer lives. These links are what lets a France Travail offer
 * be recognised as the same offer already collected from a company's own job
 * board — and they are shown on the card as extra sources.
 */
export function readPartnerUrls(offer: FranceTravailOffer): string[] {
  const urls = [
    text(offer.origineOffre?.urlOrigine),
    ...(offer.origineOffre?.partenaires ?? []).map((partner) => text(partner?.url)),
  ].filter(Boolean);

  return [...new Set(urls)];
}

function isAnonymous(companyName: string): boolean {
  const folded = companyName.toLowerCase();

  return ANONYMOUS_MARKERS.some((marker) => folded.includes(marker));
}

function isRemote(haystack: string): boolean {
  const folded = haystack.toLowerCase();

  return REMOTE_MARKERS.some((marker) => folded.includes(marker));
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function coordinate(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number(value) : value;

  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
}

/** The creation date, never `dateActualisation`: a repost must not look new. */
function isoDate(value: unknown): string | null {
  const parsed = Date.parse(text(value));

  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}
