import {
  headcountLabel,
  type CompanyBadge,
  type CompanyCheckSheet,
  type CompanyProfile,
} from "@cvforge/types";
import { EMPLOYER_PAGE_URL } from "./employer-pages.source";

/**
 * What the Annuaire des entreprises answers for one company, trimmed to the
 * fields read (US-121, verified live on 2026-09-24).
 */
export interface AnnuaireResult {
  siren?: string;
  nom_raison_sociale?: string | null;
  nom_complet?: string | null;
  activite_principale?: string | null;
  section_activite_principale?: string | null;
  /** "O" when fully public; "P" hides what the company asked to withhold. */
  statut_diffusion?: string | null;
  siege?: { libelle_commune?: string | null; code_postal?: string | null } | null;
  categorie_entreprise?: string | null;
  tranche_effectif_salarie?: string | null;
  date_creation?: string | null;
  nombre_etablissements_ouverts?: number | null;
  etat_administratif?: string | null;
  finances?: Record<string, { ca?: number | null; resultat_net?: number | null }> | null;
  complements?: {
    est_societe_mission?: boolean | null;
    est_ess?: boolean | null;
    est_siae?: boolean | null;
    bilan_ges_renseigne?: boolean | null;
    egapro_renseignee?: boolean | null;
    est_entrepreneur_individuel?: boolean | null;
  } | null;
}

/** One Egapro declaration, trimmed. */
export interface EgaproEntry {
  entreprise?: { siren?: string };
  notes?: Record<string, number | null>;
}

export interface CompanyRecord {
  legalName: string;
  /** Whether a public page may show it (see `isPublishable`). */
  publishable: boolean;
  nafCode: string;
  category: string;
  headcountBand: string;
  createdOn: string | null;
  openEstablishments: number | null;
  financesYear: string | null;
  revenue: number | null;
  netIncome: number | null;
  closed: boolean;
  mission: boolean;
  ess: boolean;
  inclusive: boolean;
  gesReport: boolean;
  /** Whether Egapro has a declaration worth asking for. */
  egaproDeclared: boolean;
  egaproScore: number | null;
  egaproYear: string | null;
}

export interface StoredCompany
  extends Omit<CompanyRecord, "egaproDeclared" | "publishable"> {
  siren: string;
  /** Null for a record read before US-140: not shown until read again. */
  publishable: boolean | null;
  found: boolean;
  refreshedAt: Date;
  employerPagePath: string | null;
  employerPageOffers: number | null;
  employerPageEdited: boolean;
  employerPageReadAt: Date | null;
  logoUrl: string | null;
  logoReadAt: Date | null;
}

const CATEGORIES = new Set(["PME", "ETI", "GE"]);
/** Nine digits: INSEE's number of a company. */
export const SIREN = /^\d{9}$/;

/**
 * Only named companies: a sole trader's record names a person, a unit that
 * asked INSEE to withhold its data is not ours to show, and the Annuaire
 * answers some SIRENs with a blank record (123456789 on 2026-09-24).
 */
export function isPublishable(result: AnnuaireResult): result is AnnuaireResult & {
  siren: string;
} {
  return (
    typeof result.siren === "string" &&
    SIREN.test(result.siren) &&
    Boolean(result.nom_raison_sociale || result.nom_complet) &&
    result.statut_diffusion !== "P" &&
    result.complements?.est_entrepreneur_individuel !== true
  );
}

/** The Annuaire's answer for `siren`, or null when it lists another company. */
export function readCompanyRecord(
  siren: string,
  results: readonly AnnuaireResult[] | undefined,
): CompanyRecord | null {
  const result = results?.find((entry) => entry.siren === siren);
  if (!result) return null;

  const complements = result.complements ?? {};
  const [financesYear, finances] = latestFinances(result.finances);
  const category = result.categorie_entreprise ?? "";

  return {
    category: CATEGORIES.has(category) ? category : "",
    closed: result.etat_administratif === "C",
    createdOn: result.date_creation ?? null,
    egaproDeclared: complements.egapro_renseignee === true,
    egaproScore: null,
    egaproYear: null,
    ess: complements.est_ess === true,
    financesYear,
    gesReport: complements.bilan_ges_renseigne === true,
    headcountBand: result.tranche_effectif_salarie ?? "",
    inclusive: complements.est_siae === true,
    legalName: result.nom_raison_sociale || result.nom_complet || "",
    mission: complements.est_societe_mission === true,
    nafCode: result.activite_principale ?? "",
    netIncome: finances?.resultat_net ?? null,
    openEstablishments: result.nombre_etablissements_ouverts ?? null,
    publishable: isPublishable(result),
    revenue: finances?.ca ?? null,
  };
}

/** The latest year Egapro scored, a year without a score ("NC") skipped. */
export function readEgaproScore(
  siren: string,
  entries: readonly EgaproEntry[] | undefined,
): { score: number; year: string } | null {
  const notes = entries?.find((entry) => entry.entreprise?.siren === siren)?.notes;
  const scored = Object.entries(notes ?? {})
    .filter((entry): entry is [string, number] => typeof entry[1] === "number")
    .sort(([left], [right]) => right.localeCompare(left));
  const [latest] = scored;

  return latest ? { score: latest[1], year: latest[0] } : null;
}

export function companyBadges(company: StoredCompany): CompanyBadge[] {
  if (!company.found) return [];

  const badges: CompanyBadge[] = [];
  if (company.mission) badges.push({ key: "mission", label: "Société à mission" });
  if (company.ess) {
    badges.push({ key: "ess", label: "Économie sociale et solidaire" });
  }
  if (company.inclusive) {
    badges.push({ key: "inclusive", label: "Entreprise inclusive" });
  }
  if (company.egaproScore !== null) {
    badges.push({
      key: "egapro",
      label: `Index égalité F/H : ${company.egaproScore}/100 (${company.egaproYear})`,
    });
  }
  if (company.gesReport) badges.push({ key: "ges", label: "Bilan carbone publié" });

  return badges;
}

export function toCompanyProfile(company: StoredCompany): CompanyProfile | null {
  if (!company.found) return null;

  return {
    badges: companyBadges(company),
    category: companyCategory(company.category),
    closed: company.closed,
    createdOn: company.createdOn,
    employerPage: employerPageOf(company),
    finances: company.financesYear
      ? {
          netIncome: company.netIncome,
          revenue: company.revenue,
          year: company.financesYear,
        }
      : null,
    headcountLabel: headcountLabel(company.headcountBand),
    legalName: company.legalName,
    openEstablishments: company.openEstablishments,
    refreshedAt: company.refreshedAt.toISOString(),
    siren: company.siren,
  };
}

/** INSEE's class of the company, null for anything else. */
export function companyCategory(value: string): CompanyProfile["category"] {
  return CATEGORIES.has(value) ? (value as CompanyProfile["category"]) : null;
}

/** Its France Travail page, when the refresh found one (US-116). */
export function employerPageOf(
  company: Pick<
    StoredCompany,
    "employerPagePath" | "employerPageOffers" | "employerPageEdited"
  >,
): CompanyProfile["employerPage"] {
  return company.employerPagePath
    ? {
        edited: company.employerPageEdited,
        offers: company.employerPageOffers ?? 0,
        url: `${EMPLOYER_PAGE_URL}/${company.employerPagePath}`,
      }
    : null;
}

/**
 * One company's sheet, as the employer check (US-139) and the company pages
 * (US-140) show it: the record, its Egapro score and its employer page.
 */
export function toCompanyCheckSheet(
  siren: string,
  record: Omit<CompanyRecord, "egaproDeclared" | "egaproScore" | "egaproYear" | "publishable">,
  extras: Pick<CompanyCheckSheet, "egapro" | "employerPage" | "nafSection">,
): CompanyCheckSheet {
  return {
    ...extras,
    category: companyCategory(record.category),
    closed: record.closed,
    createdOn: record.createdOn,
    ess: record.ess,
    finances: record.financesYear
      ? {
          netIncome: record.netIncome,
          revenue: record.revenue,
          year: record.financesYear,
        }
      : null,
    gesReport: record.gesReport,
    headcountBand: record.headcountBand,
    inclusive: record.inclusive,
    legalName: record.legalName,
    mission: record.mission,
    nafCode: record.nafCode,
    openEstablishments: record.openEstablishments,
    siren,
  };
}

/** The last NAF division of each section, "62.02A" being in J (58 to 63). */
const NAF_SECTIONS: [lastDivision: number, section: string][] = [
  [3, "A"], [9, "B"], [33, "C"], [35, "D"], [39, "E"], [43, "F"], [47, "G"],
  [53, "H"], [56, "I"], [63, "J"], [66, "K"], [68, "L"], [75, "M"], [82, "N"],
  [84, "O"], [85, "P"], [88, "Q"], [93, "R"], [96, "S"], [98, "T"], [99, "U"],
];

/**
 * The section letter of a NAF code, which the copy does not keep: the
 * Annuaire's `section_activite_principale`, worked out from the division.
 */
export function nafSectionOf(nafCode: string): string {
  const division = Number(/^(\d{2})\./.exec(nafCode)?.[1]);
  if (!division) return "";

  return NAF_SECTIONS.find(([last]) => division <= last)?.[1] ?? "";
}

/** A SIRET's company: its first nine digits. */
export function sirenOf(siret: string): string {
  return siret.slice(0, 9);
}

function latestFinances(
  finances: AnnuaireResult["finances"],
): [string | null, { ca?: number | null; resultat_net?: number | null } | null] {
  const [latest] = Object.keys(finances ?? {}).sort().reverse();

  return latest ? [latest, finances?.[latest] ?? null] : [null, null];
}
