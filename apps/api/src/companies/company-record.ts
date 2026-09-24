import type {
  CompanyBadge,
  CompanyProfile,
} from "@cvforge/types";

/**
 * What the Annuaire des entreprises answers for one company, trimmed to the
 * fields read (US-121, verified live on 2026-09-24).
 */
export interface AnnuaireResult {
  siren?: string;
  nom_raison_sociale?: string | null;
  nom_complet?: string | null;
  activite_principale?: string | null;
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
  } | null;
}

/** One Egapro declaration, trimmed. */
export interface EgaproEntry {
  entreprise?: { siren?: string };
  notes?: Record<string, number | null>;
}

export interface CompanyRecord {
  legalName: string;
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

export interface StoredCompany extends Omit<CompanyRecord, "egaproDeclared"> {
  siren: string;
  found: boolean;
  refreshedAt: Date;
}

const CATEGORIES = new Set(["PME", "ETI", "GE"]);

/** INSEE's headcount bands; "NN" and "00" say nothing worth showing. */
const HEADCOUNT_BANDS: Record<string, string> = {
  "01": "1 ou 2 salariés",
  "02": "3 à 5 salariés",
  "03": "6 à 9 salariés",
  "11": "10 à 19 salariés",
  "12": "20 à 49 salariés",
  "21": "50 à 99 salariés",
  "22": "100 à 199 salariés",
  "31": "200 à 249 salariés",
  "32": "250 à 499 salariés",
  "41": "500 à 999 salariés",
  "42": "1 000 à 1 999 salariés",
  "51": "2 000 à 4 999 salariés",
  "52": "5 000 à 9 999 salariés",
  "53": "10 000 salariés et plus",
};

export function headcountLabel(band: string): string {
  return HEADCOUNT_BANDS[band] ?? "";
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
    category: CATEGORIES.has(company.category)
      ? (company.category as CompanyProfile["category"])
      : null,
    closed: company.closed,
    createdOn: company.createdOn,
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
