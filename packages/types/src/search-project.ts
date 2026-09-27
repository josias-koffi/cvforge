/**
 * The search project: what a candidate is looking for, attached to one profile.
 *
 * The profile says what the candidate *is*; this says what they *want*. It is
 * the single source of truth for matching job offers (hard filters and score),
 * for matching companies, and for the "contrats recherchés" line of a generated
 * letter — which used to be a free-text field on the profile.
 */

export const searchContractTypes = [
  "cdi",
  "cdd",
  "interim",
  "freelance",
  "stage",
  "alternance",
  "vie",
] as const;
export type SearchContractType = (typeof searchContractTypes)[number];

export const searchExperienceLevels = [
  "debutant",
  "junior",
  "confirme",
  "senior",
] as const;
export type SearchExperienceLevel = (typeof searchExperienceLevels)[number];

export const searchRemoteModes = [
  "any",
  "onsite",
  "hybrid",
  "full_remote",
] as const;
export type SearchRemoteMode = (typeof searchRemoteModes)[number];

export const searchCompanySizes = ["tpe", "pme", "eti", "ge"] as const;
export type SearchCompanySize = (typeof searchCompanySizes)[number];

/**
 * Company traits a candidate can ask for. Each one maps to an official,
 * free source (API Recherche d'entreprises, index Egapro) — never to a
 * self-declared claim.
 */
export const searchCompanyValues = [
  "societe_mission",
  "ess",
  "egapro_75plus",
  "bilan_ges",
] as const;
export type SearchCompanyValue = (typeof searchCompanyValues)[number];

export const apprenticeshipKinds = [
  "apprentissage",
  "professionnalisation",
  "any",
] as const;
export type ApprenticeshipKind = (typeof apprenticeshipKinds)[number];

/**
 * Readable sectors, each mapped to the NAF divisions (2 digits) behind it.
 *
 * The mapping lives here only: France Travail is queried with these codes, and
 * a company's NAF code read from the public company API is matched back
 * through the same table.
 */
export const searchSectors = [
  { id: "numerique", label: "Numérique et informatique", nafDivisions: ["62", "63"] },
  { id: "telecom", label: "Télécommunications", nafDivisions: ["61"] },
  {
    id: "conseil",
    label: "Conseil et ingénierie",
    nafDivisions: ["70", "71", "72", "73", "74"],
  },
  { id: "juridique", label: "Juridique et comptabilité", nafDivisions: ["69"] },
  { id: "finance", label: "Banque, finance et assurance", nafDivisions: ["64", "65", "66"] },
  {
    id: "industrie",
    label: "Industrie et production",
    nafDivisions: [
      "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21",
      "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33",
    ],
  },
  { id: "construction", label: "Construction et BTP", nafDivisions: ["41", "42", "43"] },
  {
    id: "energie_environnement",
    label: "Énergie et environnement",
    nafDivisions: ["35", "36", "37", "38", "39"],
  },
  { id: "commerce", label: "Commerce et distribution", nafDivisions: ["45", "46", "47"] },
  {
    id: "transport_logistique",
    label: "Transport et logistique",
    nafDivisions: ["49", "50", "51", "52", "53"],
  },
  { id: "sante_social", label: "Santé et action sociale", nafDivisions: ["86", "87", "88"] },
  { id: "education", label: "Éducation et formation", nafDivisions: ["85"] },
  {
    id: "hotellerie_restauration",
    label: "Hôtellerie et restauration",
    nafDivisions: ["55", "56"],
  },
  { id: "immobilier", label: "Immobilier", nafDivisions: ["68"] },
  { id: "media", label: "Médias et communication", nafDivisions: ["58", "59", "60"] },
  { id: "arts_culture", label: "Arts, culture et sport", nafDivisions: ["90", "91", "92", "93"] },
  { id: "rh", label: "Ressources humaines et recrutement", nafDivisions: ["78"] },
  {
    id: "services_entreprises",
    label: "Services aux entreprises",
    nafDivisions: ["77", "79", "80", "81", "82"],
  },
  { id: "agriculture", label: "Agriculture et agroalimentaire", nafDivisions: ["01", "02", "03"] },
  { id: "administration", label: "Administration publique", nafDivisions: ["84"] },
  {
    id: "autres_services",
    label: "Autres services",
    nafDivisions: ["94", "95", "96", "97", "98", "99"],
  },
] as const;

export type SearchSectorId = (typeof searchSectors)[number]["id"];

/** A place to work, with the radius the candidate accepts around it. */
export interface SearchLocation {
  /** INSEE code of the commune, when it was picked from the autocomplete. */
  inseeCode: string;
  label: string;
  /** INSEE department code ("75", "2A"), used to batch source queries. */
  department: string;
  latitude: number | null;
  longitude: number | null;
  radiusKm: number;
}

export interface InternshipPreferences {
  /** ISO date, the earliest acceptable start. */
  startDate: string;
  durationMonths: number | null;
  /** "bac+3", "bac+5"… free text: schools name these in too many ways. */
  schoolLevel: string;
}

export interface ApprenticeshipPreferences {
  startDate: string;
  durationMonths: number | null;
  /** "3j/2j", "1 sem/1 sem" — free text, straight from the school's calendar. */
  rhythm: string;
  contractKind: ApprenticeshipKind;
  diploma: string;
  schoolName: string;
}

export interface SearchProject {
  /** The profile this search belongs to, one for one. */
  profileId: string;
  targetRoles: string[];
  experienceLevel: SearchExperienceLevel | null;
  contractTypes: SearchContractType[];
  partTimeOk: boolean;
  internship: InternshipPreferences | null;
  apprenticeship: ApprenticeshipPreferences | null;
  sectors: SearchSectorId[];
  excludedSectors: SearchSectorId[];
  locations: SearchLocation[];
  remote: SearchRemoteMode;
  nationalMobility: boolean;
  /** Gross yearly, in euros. Never a hard filter — most offers hide it. */
  salaryMinYearly: number | null;
  companySizes: SearchCompanySize[];
  companyValues: SearchCompanyValue[];
  excludedCompanies: string[];
  digestEnabled: boolean;
  emailEnabled: boolean;
  aiRerankEnabled: boolean;
  updatedAt: string | null;
}

export const DEFAULT_SEARCH_RADIUS_KM = 25;

export function emptySearchProject(profileId: string): SearchProject {
  return {
    aiRerankEnabled: false,
    apprenticeship: null,
    companySizes: [],
    companyValues: [],
    contractTypes: [],
    digestEnabled: false,
    emailEnabled: true,
    excludedCompanies: [],
    excludedSectors: [],
    experienceLevel: null,
    internship: null,
    locations: [],
    nationalMobility: false,
    partTimeOk: false,
    profileId,
    remote: "any",
    salaryMinYearly: null,
    sectors: [],
    targetRoles: [],
    updatedAt: null,
  };
}

/** The NAF divisions a set of sectors covers, deduplicated. */
export function nafDivisionsForSectors(
  sectorIds: readonly SearchSectorId[],
): string[] {
  const divisions = new Set<string>();

  for (const sector of searchSectors) {
    if (!sectorIds.includes(sector.id)) continue;
    for (const division of sector.nafDivisions) divisions.add(division);
  }

  return [...divisions];
}

/** The sector a NAF code belongs to ("62.01Z" and "6201Z" both read as 62). */
export function sectorForNafCode(nafCode: string): SearchSectorId | null {
  const division = nafCode.replace(/[^0-9]/g, "").slice(0, 2);
  if (division.length < 2) return null;

  return (
    searchSectors.find((sector) =>
      (sector.nafDivisions as readonly string[]).includes(division),
    )?.id ?? null
  );
}
