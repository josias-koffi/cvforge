/**
 * The company behind a hiring establishment (US-121): its public record from
 * the Annuaire des entreprises, and its commitments. Read monthly in the
 * background, never on a page view.
 */

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
