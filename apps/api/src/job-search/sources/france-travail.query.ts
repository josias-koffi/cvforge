import type { SearchContractType, SearchProject } from "@cvforge/types";
import { nafDivisionsForSectors } from "@cvforge/types";
import type { JobSourceQuery } from "../job-search.types";

/**
 * Translating a search project into France Travail's own vocabulary.
 *
 * ⚠️ The codes below come from the API's published reference lists. They are
 * the one part of the adapter that cannot be proven by a unit test — a wrong
 * code silently returns zero offers rather than failing. They must be checked
 * against the live reference endpoints once credentials exist (sprint 025,
 * "To Clarify" #1).
 */

/** `typeContrat` reference list. */
const CONTRACT_CODES: Partial<Record<SearchContractType, string>> = {
  cdd: "CDD",
  cdi: "CDI",
  freelance: "LIB",
  interim: "MIS",
};

/**
 * `natureContrat`: apprenticeship and professionalisation are not contract
 * *types* at France Travail, they are contract *natures*. A search for an
 * alternance that only sets `typeContrat` returns nothing.
 */
const APPRENTICESHIP_NATURES = ["E2", "FS"] as const;

/** `experience`: 1 = under a year, 2 = one to three years, 3 = over three. */
const EXPERIENCE_CODES: Record<string, string> = {
  confirme: "3",
  debutant: "1",
  junior: "2",
  senior: "3",
};

const MAX_KEYWORD_CHARS = 200;

export interface FranceTravailParams {
  motsCles?: string;
  departement?: string;
  typeContrat?: string;
  natureContrat?: string;
  secteurActivite?: string;
  experience?: string;
  publieeDepuis?: string;
  range: string;
}

/**
 * One query per (keywords × department) pair, so several candidates looking
 * for the same job in the same department cost a single call.
 */
export function buildSourceQueries(
  projects: readonly SearchProject[],
  publishedSinceDays: number,
): JobSourceQuery[] {
  const byKey = new Map<string, JobSourceQuery>();

  for (const project of projects) {
    const departments = uniqueDepartments(project);

    for (const role of project.targetRoles) {
      const keywords = role.trim().slice(0, MAX_KEYWORD_CHARS);
      if (!keywords) continue;

      for (const department of departments) {
        const key = `${keywords.toLowerCase()}|${department}`;
        const existing = byKey.get(key);

        if (existing) {
          mergeInto(existing, project);
          continue;
        }

        byKey.set(key, {
          contractTypes: [...project.contractTypes],
          department,
          experienceLevel: project.experienceLevel,
          keywords,
          nafDivisions: nafDivisionsForSectors(project.sectors),
          publishedSinceDays,
        });
      }
    }
  }

  return [...byKey.values()];
}

/**
 * Two candidates asking for the same job in the same department share one
 * call, so the query has to cover both: the union of their contracts and
 * sectors, and no experience filter as soon as they disagree. Filtering back
 * down to what each of them actually asked for happens locally, at scoring
 * time, where it costs nothing.
 */
function mergeInto(query: JobSourceQuery, project: SearchProject): void {
  for (const contract of project.contractTypes) {
    if (!query.contractTypes.includes(contract)) {
      query.contractTypes.push(contract);
    }
  }

  const divisions = nafDivisionsForSectors(project.sectors);
  // An empty sector list means "any sector"; unioning it with a narrow one
  // would wrongly narrow the shared query.
  if (divisions.length === 0 || query.nafDivisions.length === 0) {
    query.nafDivisions = [];
  } else {
    for (const division of divisions) {
      if (!query.nafDivisions.includes(division)) {
        query.nafDivisions.push(division);
      }
    }
  }

  if (query.experienceLevel !== project.experienceLevel) {
    query.experienceLevel = null;
  }
}

/** A candidate mobile nationwide is searched without a department filter. */
function uniqueDepartments(project: SearchProject): string[] {
  if (project.nationalMobility || project.remote === "full_remote") return [""];

  const departments = project.locations
    .map((location) => location.department)
    .filter(Boolean);

  return departments.length > 0 ? [...new Set(departments)] : [""];
}

/** The query as France Travail's search endpoint expects it. */
export function toFranceTravailParams(
  query: JobSourceQuery,
  range: string,
): FranceTravailParams {
  const contracts = query.contractTypes
    .map((contract) => CONTRACT_CODES[contract])
    .filter((code): code is string => Boolean(code));
  const wantsApprenticeship = query.contractTypes.includes("alternance");

  return {
    ...(query.keywords ? { motsCles: query.keywords } : {}),
    ...(query.department ? { departement: query.department } : {}),
    // Contracts and natures are ORed by the API, so asking for both a CDI and
    // an alternance in one call is fine. Sending neither means "everything",
    // which is what a candidate open to anything wants.
    ...(contracts.length > 0 ? { typeContrat: contracts.join(",") } : {}),
    ...(wantsApprenticeship
      ? { natureContrat: APPRENTICESHIP_NATURES.join(",") }
      : {}),
    ...(query.nafDivisions.length > 0
      ? { secteurActivite: query.nafDivisions.join(",") }
      : {}),
    ...(query.experienceLevel && EXPERIENCE_CODES[query.experienceLevel]
      ? { experience: EXPERIENCE_CODES[query.experienceLevel] }
      : {}),
    ...(query.publishedSinceDays > 0
      ? { publieeDepuis: String(query.publishedSinceDays) }
      : {}),
    range,
  };
}
