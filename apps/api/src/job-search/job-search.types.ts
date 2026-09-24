import type { SearchContractType } from "@cvforge/types";

/** Every source the collection can read from. */
export const jobSources = [
  "france_travail",
  "la_bonne_alternance",
  "adzuna",
  "greenhouse",
  "lever",
  "ashby",
  "smartrecruiters",
  "workable",
  "recruitee",
  "personio",
  "welcomekit",
] as const;
export type JobSource = (typeof jobSources)[number];

/**
 * One offer as a source publishes it, mapped to our own shape.
 *
 * Deliberately flat and source-agnostic: the deduplicator, the scorer and the
 * page all read this, never a raw payload. `raw` keeps the original so a
 * mapping bug can be diagnosed — and fixed — without re-fetching.
 */
export interface NormalizedJobListing {
  source: JobSource;
  /** The source's own id. Unique per source, never across sources. */
  externalId: string;
  title: string;
  companyName: string;
  /** Empty when the source hides the employer ("entreprise confidentielle"). */
  companyAnonymous: boolean;
  description: string;
  locationLabel: string;
  /** INSEE department code ("75", "2A"), empty when the source gave none. */
  department: string;
  latitude: number | null;
  longitude: number | null;
  remote: boolean;
  contractType: SearchContractType | "unknown";
  salaryLabel: string;
  /** Where the offer is read. */
  url: string;
  /** Where one actually applies, when the source says. */
  applyUrl: string;
  /**
   * Other places the same offer is published, as the source declares them.
   * They serve twice: to merge duplicates, and as extra links on the card.
   */
  partnerUrls: string[];
  /** Creation date at the source, never the "refreshed" date. */
  publishedAt: string | null;
  /** The ROME job the source filed the offer under, when it says (US-124). */
  rome?: ListingRome;
  raw: unknown;
}

/**
 * ROME data an offer carries. Measured on Offres v2, 2026-09-24: the ROME code
 * and the appellation's label on every offer, skills on a fifth to two fifths
 * of them, never an appellation code — and never a SIRET, not even on the
 * detail page.
 */
export interface ListingRome {
  code: string;
  /** Label only: offers name the appellation, they never give its code. */
  appellationLabel: string;
  competences: ListingCompetence[];
}

export interface ListingCompetence {
  code: string;
  label: string;
  /** `exigence` "E" (required) against "S" (wished for), at France Travail. */
  required: boolean;
}

/**
 * One search to run against a source. Built by grouping candidates' search
 * projects, so the same query serves everyone who asked for it.
 */
export interface JobSourceQuery {
  /** Empty for a query by ROME job. */
  keywords: string;
  /**
   * ROME job codes, for the queries built from a candidate's confirmed jobs
   * (US-124). Empty for a keyword query: the two kinds are never mixed.
   */
  romeCodes: string[];
  department: string;
  contractTypes: SearchContractType[];
  /** NAF divisions, from the readable sectors. */
  nafDivisions: string[];
  experienceLevel: string | null;
  /** How many days back to collect. The daily run asks for one. */
  publishedSinceDays: number;
}

export interface JobSourceAdapter {
  readonly source: JobSource;
  search(query: JobSourceQuery): Promise<NormalizedJobListing[]>;
  /**
   * Whether the offer is still online. Used right before showing it and again
   * when the candidate clicks "Postuler", so a forgotten offer never costs a
   * credit. A source that cannot answer returns `null` — "unknown", which is
   * not the same as "closed".
   */
  isStillOpen(externalId: string): Promise<boolean | null>;
}
