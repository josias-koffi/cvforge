/**
 * The company behind a hiring establishment (US-121): its public record from
 * the Annuaire des entreprises, and its commitments. Read monthly in the
 * background, never on a page view.
 */

import type { Locale } from "./locale";

export type CompanyBadgeKey = "mission" | "ess" | "inclusive" | "egapro" | "ges";

export interface CompanyBadge {
  key: CompanyBadgeKey;
  /** Ready to show: "Index égalité F/H : 94/100 (2025)". */
  label: string;
}

export interface CompanyProfile {
  siren: string;
  legalName: string;
  /** "PME", "ETI" or "GE", as INSEE classes it; null when unknown. */
  category: "PME" | "ETI" | "GE" | null;
  /** "100 à 199 salariés", or "" when INSEE does not publish it. */
  headcountLabel: string;
  /** ISO date. */
  createdOn: string | null;
  /** Its page on France Travail's employer directory, when it has one (US-116). */
  employerPage: { url: string; offers: number; edited: boolean } | null;
  openEstablishments: number | null;
  /** The last published accounts, in euros. */
  finances: { year: string; revenue: number | null; netIncome: number | null } | null;
  /** Ceased activity: the establishment may still be listed by France Travail. */
  closed: boolean;
  badges: CompanyBadge[];
  refreshedAt: string;
}

export const COMPANY_CATEGORY_LABELS: Record<
  NonNullable<CompanyProfile["category"]>,
  string
> = {
  ETI: "Entreprise de taille intermédiaire",
  GE: "Grande entreprise",
  PME: "Petite ou moyenne entreprise",
};

/** The attributions shown wherever these data appear. */
export const COMPANY_SOURCE_LABEL =
  "Source : Annuaire des entreprises (API Recherche d'entreprises, État)";
export const EMPLOYER_PAGE_SOURCE_LABEL =
  "Page employeur : France Travail (Synthèse Pages employeurs)";
export const EGAPRO_SOURCE_LABEL =
  "Index de l'égalité professionnelle : ministère du Travail (Egapro)";

/** INSEE's headcount bands; "NN" and "00" say nothing worth showing. */
const HEADCOUNT_BANDS: Record<string, { min: number; max: number | null }> = {
  "01": { max: 2, min: 1 },
  "02": { max: 5, min: 3 },
  "03": { max: 9, min: 6 },
  "11": { max: 19, min: 10 },
  "12": { max: 49, min: 20 },
  "21": { max: 99, min: 50 },
  "22": { max: 199, min: 100 },
  "31": { max: 249, min: 200 },
  "32": { max: 499, min: 250 },
  "41": { max: 999, min: 500 },
  "42": { max: 1999, min: 1000 },
  "51": { max: 4999, min: 2000 },
  "52": { max: 9999, min: 5000 },
  "53": { max: null, min: 10000 },
};

/** "100 à 199 salariés", "100–199 employees", or "" for an unpublished band. */
export function headcountLabel(band: string, locale: Locale = "fr"): string {
  const range = HEADCOUNT_BANDS[band];
  if (!range) return "";

  const { max, min } = range;
  // A plain space, not the narrow one `toLocaleString("fr")` puts in.
  const count = (value: number) =>
    locale === "fr"
      ? String(value).replace(/\B(?=(\d{3})+$)/g, " ")
      : value.toLocaleString("en-US");

  if (locale === "en") {
    return max === null
      ? `${count(min)}+ employees`
      : `${count(min)}–${count(max)} employees`;
  }
  if (max === null) return `${count(min)} salariés et plus`;

  return `${count(min)} ${max === min + 1 ? "ou" : "à"} ${count(max)} salariés`;
}
