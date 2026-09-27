import type { CompanyProfile } from "./companies";

/**
 * The free "check an employer" tool of the landing (US-139): a search of the
 * Annuaire des entreprises by name or SIREN, then one company's record. Read
 * on demand from public, keyless sources; nothing is stored.
 */

/** One line of the search: enough to tell namesakes apart. */
export interface CompanyCheckMatch {
  siren: string;
  name: string;
  /** The head office's town and postcode, "" when unpublished. */
  city: string;
  postcode: string;
  /** NAF code, "62.02A". */
  nafCode: string;
  /** INSEE band, formatted by `headcountLabel`. */
  headcountBand: string;
  closed: boolean;
}

export type PublicCompanyCheckSearch = { matches: CompanyCheckMatch[] };

/** One company's record, as the tool shows it. */
export interface CompanyCheckSheet {
  siren: string;
  legalName: string;
  category: CompanyProfile["category"];
  headcountBand: string;
  nafCode: string;
  /** The NAF section letter, "J"; "" when unknown. */
  nafSection: string;
  /** ISO date. */
  createdOn: string | null;
  openEstablishments: number | null;
  finances: CompanyProfile["finances"];
  closed: boolean;
  mission: boolean;
  ess: boolean;
  inclusive: boolean;
  /** A greenhouse gas report published on the ADEME's platform. */
  gesReport: boolean;
  /** The latest scored year; null when not declared or not scored. */
  egapro: { score: number; year: string } | null;
  /** Its France Travail page, when the hourly company refresh found one. */
  employerPage: CompanyProfile["employerPage"];
}

export type PublicCompanyCheckResponse =
  | { status: "found"; company: CompanyCheckSheet }
  | { status: "unknown" };

/** The public record the tool links to as its source. */
export const ANNUAIRE_COMPANY_URL =
  "https://annuaire-entreprises.data.gouv.fr/entreprise";
