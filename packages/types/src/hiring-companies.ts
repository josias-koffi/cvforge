/**
 * "Entreprises qui recrutent" (US-119): the companies La Bonne Boîte expects
 * to hire in a candidate's jobs, near their places, whether or not they
 * published an offer. Read weekly from France Travail, never on a page view.
 */

import type { CompanyBadge, CompanyProfile } from "./companies";

export interface HiringCompany {
  siret: string;
  name: string;
  /** The sector, as the NAF names it ("Conseil en systèmes et logiciels informatiques"). */
  nafLabel: string;
  city: string;
  postcode: string;
  /** Null when France Travail does not know the headcount. */
  headcountMin: number | null;
  headcountMax: number | null;
  /** La Bonne Boîte's own score: higher means more hires expected. */
  hiringPotential: number;
  /** La Bonne Boîte's "fort potentiel d'embauche". */
  highPotential: boolean;
  /** The confirmed job it was found for. */
  romeCode: string;
  romeLabel: string;
  /** The company's commitments (US-121); empty before its first reading. */
  badges: CompanyBadge[];
}

export type HiringCompaniesStatus =
  /** No confirmed ROME job in the search. */
  | "no_rome"
  /** No place in the search. */
  | "no_location"
  /** Confirmed and placed, but not read yet: within the hour. */
  | "pending"
  | "ready";

export interface HiringCompaniesView {
  status: HiringCompaniesStatus;
  companies: HiringCompany[];
  /** When the oldest of the readings shown was made, ISO; null before any. */
  refreshedAt: string | null;
}

/** One establishment of the candidate's list, and its company (US-121). */
export interface HiringCompanyDetail {
  company: HiringCompany;
  /** Null before the first reading, or when the SIREN is unknown. */
  profile: CompanyProfile | null;
}

/** The attribution shown wherever La Bonne Boîte data appears (ADR-024 §4). */
export const LA_BONNE_BOITE_SOURCE_LABEL =
  "Source : La Bonne Boîte, France Travail";
