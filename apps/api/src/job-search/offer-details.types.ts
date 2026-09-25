import type { JobSource } from "./job-search.types";

/** A requirement a source marks as either required or merely wished for. */
export interface OfferRequirement {
  label: string;
  required: boolean;
}

/**
 * Where the candidate actually applies. France Travail often only relays an
 * offer: its own "Postuler" button leads to the employer's site, or to a
 * partner job board, and this is that link.
 */
export interface OfferApplyTarget {
  url: string;
  /** `source` means the advert's own page is where one applies. */
  target: "employer" | "partner" | "source";
  /** The site's host name, e.g. `www.meteojob.com`. */
  host: string;
  /** The partner board's name, e.g. "Meteojob"; "" for any other target. */
  name: string;
}

/**
 * What an advert says beyond its text: the structured fields each source
 * publishes, read from the payload kept at collection (`job_listings.raw`).
 * Every field is empty when the source does not give it — most do not.
 */
export interface OfferDetails {
  /** The source these details come from, always shown to the candidate. */
  source: JobSource;
  /** The job board France Travail relays the offer from, "" when none. */
  via: string;
  apply: OfferApplyTarget | null;
  /** The employer's careers page or website, "" when unknown. */
  companyWebsite: string;
  companyDescription: string;
  /** Labels such as "Entreprise adaptée". */
  companyBadges: string[];
  /** Short facts shown as a grid: contract, hours, sector, team… */
  facts: Array<{ label: string; value: string }>;
  salary: { label: string; comment: string; benefits: string[] } | null;
  experience: { label: string; required: boolean; comment: string } | null;
  education: OfferRequirement[];
  languages: OfferRequirement[];
  licences: OfferRequirement[];
  softSkills: Array<{ label: string; description: string }>;
  /** Parts of the advert a source keeps apart from its description. */
  sections: Array<{ title: string; text: string }>;
  contact: { name: string; email: string; lines: string[] } | null;
  /** France Travail's own flag for an offer that draws few applicants. */
  lacksCandidates: boolean;
}

/** The part of a stored advert its details are read from. */
export interface ListingForDetails {
  source: JobSource;
  url: string;
  applyUrl: string;
  companyAnonymous: boolean;
  raw: unknown;
}

export function emptyDetails(source: JobSource): OfferDetails {
  return {
    apply: null,
    companyBadges: [],
    companyDescription: "",
    companyWebsite: "",
    contact: null,
    education: [],
    experience: null,
    facts: [],
    lacksCandidates: false,
    languages: [],
    licences: [],
    salary: null,
    sections: [],
    softSkills: [],
    source,
    via: "",
  };
}

/** A trimmed string, or "" for anything that is not one. */
export function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** The payload as an object, whatever was stored. */
export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Only web links: a payload is a third party's, and `javascript:` is a link. */
export function webUrl(value: unknown): string {
  const candidate = text(value);

  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : "";
  } catch {
    return "";
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/** The facts that have a value, in the order given. */
export function facts(
  entries: Array<[label: string, value: string]>,
): OfferDetails["facts"] {
  return entries
    .filter(([, value]) => value !== "")
    .map(([label, value]) => ({ label, value }));
}
