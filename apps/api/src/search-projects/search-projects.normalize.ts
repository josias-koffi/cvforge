import {
  DEFAULT_SEARCH_RADIUS_KM,
  apprenticeshipKinds,
  emptySearchProject,
  searchCompanySizes,
  searchCompanyValues,
  searchContractTypes,
  searchExperienceLevels,
  searchRemoteModes,
  searchSectors,
  type ApprenticeshipPreferences,
  type InternshipPreferences,
  type SearchContractType,
  type SearchLocation,
  type SearchProject,
  type SearchSectorId,
} from "@cvforge/types";
import { fold } from "../shared/text";

/**
 * Turns whatever the client sent into a valid search project.
 *
 * Every field is user input reaching a matcher that later builds outgoing API
 * queries, so nothing is trusted: unknown enum values are dropped rather than
 * stored, lists are bounded, and free text is trimmed. An invalid payload
 * never fails the request — it reads as "not filled in", the same as a new
 * project.
 */

const MAX_ROLES = 10;
const MAX_LOCATIONS = 10;
const MAX_EXCLUDED_COMPANIES = 50;
const MAX_TEXT = 120;
const MAX_RADIUS_KM = 200;
const MAX_SALARY = 1_000_000;

export function normalizeSearchProject(
  profileId: string,
  raw: unknown,
): SearchProject {
  const base = emptySearchProject(profileId);
  if (!isRecord(raw)) return base;

  const contractTypes = enumList(raw.contractTypes, searchContractTypes);

  return {
    ...base,
    aiRerankEnabled: boolish(raw.aiRerankEnabled, base.aiRerankEnabled),
    apprenticeship: contractTypes.includes("alternance")
      ? apprenticeship(raw.apprenticeship)
      : null,
    companySizes: enumList(raw.companySizes, searchCompanySizes),
    companyValues: enumList(raw.companyValues, searchCompanyValues),
    contractTypes,
    digestEnabled: boolish(raw.digestEnabled, base.digestEnabled),
    emailEnabled: boolish(raw.emailEnabled, base.emailEnabled),
    excludedCompanies: textList(raw.excludedCompanies, MAX_EXCLUDED_COMPANIES),
    excludedSectors: sectorList(raw.excludedSectors),
    experienceLevel: enumValue(raw.experienceLevel, searchExperienceLevels),
    internship: contractTypes.includes("stage")
      ? internship(raw.internship)
      : null,
    locations: locations(raw.locations),
    nationalMobility: boolish(raw.nationalMobility, base.nationalMobility),
    partTimeOk: boolish(raw.partTimeOk, base.partTimeOk),
    remote: enumValue(raw.remote, searchRemoteModes) ?? base.remote,
    salaryMinYearly: positiveInt(raw.salaryMinYearly, MAX_SALARY),
    sectors: sectorList(raw.sectors),
    targetRoles: textList(raw.targetRoles, MAX_ROLES),
    updatedAt: base.updatedAt,
  };
}

/**
 * Reads the legacy free-text `preferences.contractTypes` — "CDI", "stage ou
 * alternance", "Internship / Apprenticeship" — into structured contracts.
 *
 * Both languages matter: profiles imported from an English CV wrote the
 * English word in there.
 */
export function parseLegacyContractTypes(value: string): SearchContractType[] {
  const folded = fold(value);
  if (!folded) return [];

  // Padded so a pattern only matches whole words: "vie" must not fire on
  // "environnement de vie".
  const haystack = ` ${folded} `;
  const found = new Set<SearchContractType>();

  for (const [contract, patterns] of LEGACY_CONTRACT_PATTERNS) {
    if (patterns.some((pattern) => haystack.includes(` ${pattern} `))) {
      found.add(contract);
    }
  }

  // "vie" is an ordinary French word ("équilibre de vie"), so the contract is
  // only read from the spelled-out name or from the acronym in capitals.
  if (haystack.includes(" volontariat international ") || /\bV\.?I\.?E\b/.test(value)) {
    found.add("vie");
  }

  return searchContractTypes.filter((contract) => found.has(contract));
}

const LEGACY_CONTRACT_PATTERNS: Array<[SearchContractType, string[]]> = [
  ["cdi", ["cdi", "permanent", "duree indeterminee", "indetermine"]],
  ["cdd", ["cdd", "fixed term", "duree determinee", "determine"]],
  ["interim", ["interim", "temp agency"]],
  ["freelance", ["freelance", "independant", "independante", "contractor", "portage"]],
  ["stage", ["stage", "stagiaire", "internship", "intern"]],
  [
    "alternance",
    ["alternance", "alternant", "apprenti", "apprentissage", "apprenticeship", "work study"],
  ],
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boolish(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function enumList<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(value)) return [];

  const found = new Set<T>();
  for (const entry of value) {
    const parsed = enumValue(entry, allowed);
    if (parsed) found.add(parsed);
  }

  return allowed.filter((entry) => found.has(entry));
}

function sectorList(value: unknown): SearchSectorId[] {
  const ids = searchSectors.map((sector) => sector.id);

  return enumList(value, ids);
}

function textList(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];

  const entries: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim().slice(0, MAX_TEXT);
    if (trimmed && !entries.includes(trimmed)) entries.push(trimmed);
    if (entries.length >= limit) break;
  }

  return entries;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_TEXT) : "";
}

function positiveInt(value: unknown, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.min(Math.round(value), max);
}

function isoDate(value: unknown): string {
  const trimmed = text(value);

  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : "";
}

function internship(value: unknown): InternshipPreferences | null {
  if (!isRecord(value)) return null;

  return {
    durationMonths: positiveInt(value.durationMonths, 36),
    schoolLevel: text(value.schoolLevel),
    startDate: isoDate(value.startDate),
  };
}

function apprenticeship(value: unknown): ApprenticeshipPreferences | null {
  if (!isRecord(value)) return null;

  return {
    contractKind: enumValue(value.contractKind, apprenticeshipKinds) ?? "any",
    diploma: text(value.diploma),
    durationMonths: positiveInt(value.durationMonths, 36),
    rhythm: text(value.rhythm),
    schoolName: text(value.schoolName),
    startDate: isoDate(value.startDate),
  };
}

function locations(value: unknown): SearchLocation[] {
  if (!Array.isArray(value)) return [];

  const entries: SearchLocation[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;

    const label = text(entry.label);
    const inseeCode = text(entry.inseeCode);
    if (!label && !inseeCode) continue;

    entries.push({
      department: departmentFrom(inseeCode, entry.department),
      inseeCode,
      label,
      latitude: coordinate(entry.latitude, 90),
      longitude: coordinate(entry.longitude, 180),
      radiusKm: positiveInt(entry.radiusKm, MAX_RADIUS_KM) ?? DEFAULT_SEARCH_RADIUS_KM,
    });

    if (entries.length >= MAX_LOCATIONS) break;
  }

  return entries;
}

/**
 * The department is the first two characters of the INSEE code, except in
 * Corsica ("2A", "2B") and overseas, where it is three digits.
 */
function departmentFrom(inseeCode: string, fallback: unknown): string {
  const explicit = text(fallback).toUpperCase();
  if (/^(\d{2}|2[AB]|\d{3})$/.test(explicit)) return explicit;

  const code = inseeCode.toUpperCase();
  if (/^2[AB]/.test(code)) return code.slice(0, 2);
  if (/^9[789]/.test(code)) return code.slice(0, 3);

  return /^\d{2}/.test(code) ? code.slice(0, 2) : "";
}

function coordinate(value: unknown, bound: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;

  return Math.abs(value) <= bound ? value : null;
}
