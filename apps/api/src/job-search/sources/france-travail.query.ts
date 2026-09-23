import type { SearchContractType, SearchProject } from "@cvforge/types";
import { nafDivisionsForSectors } from "@cvforge/types";
import type { JobSourceQuery } from "../job-search.types";

/**
 * Translating a search project into France Travail's own vocabulary.
 *
 * Every code below was checked against the live API on 2026-09-23, through the
 * `referentiel/typesContrats`, `referentiel/naturesContrats` and
 * `referentiel/secteursActivites` endpoints and through counted searches. A
 * unit test cannot prove them: a wrong code returns an empty page, not an
 * error. Comma-separated lists are supported everywhere, and the API answers
 * 400 on an unknown code — except for `experience`, whose values are bounded.
 *
 * `typeContrat` and `natureContrat` are ORed, not ANDed: on "developpeur",
 * CDI gives 878 offers, the alternance natures 67, and both together 940 —
 * the union, minus the five apprenticeships already published as a CDI.
 */

/**
 * `typeContrat` reference list.
 *
 * **There is no code for an internship.** Among 129 adverts whose title
 * announces a "stage", 56 are published as a CDI, 24 as a CDD, 6 as an
 * interim mission — France Travail types the employment, not the studies. A
 * candidate looking only for an internship is therefore searched without any
 * contract filter, and `classifyContract` sorts the results out locally.
 */
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

/**
 * `experience`, read off the live API rather than guessed (2026-09-23): each
 * offer falls in exactly one bucket, and the five add up to the total.
 *
 *   0 = experience required, no duration given
 *   1 = under a year          2 = one to three years
 *   3 = over three years      4 = beginners welcome
 *
 * A beginner therefore belongs in **4**, not in 1: on "developpeur" over the
 * whole country, code 1 offers 43 adverts that all demand a few months on the
 * job, while code 4 offers 678 that explicitly take beginners. Each level also
 * gets the neighbouring bucket it plausibly fits; the local score refines the
 * order afterwards, so the filter only has to avoid throwing away good offers.
 */
const EXPERIENCE_CODES: Record<string, string> = {
  confirme: "2,3",
  debutant: "4",
  junior: "2,4",
  senior: "3",
};

const MAX_KEYWORD_CHARS = 200;

/**
 * `secteurActivite` takes **two NAF divisions at most** — beyond that the API
 * answers 400 and the query brings back nothing at all (measured 2026-09-23;
 * every other list parameter accepts more). A candidate who picks two sectors
 * already exceeds it, so rather than narrowing to an arbitrary pair, the
 * filter is dropped: collecting wider costs a little quota, losing the whole
 * query costs every offer.
 */
const MAX_NAF_DIVISIONS = 2;

/**
 * `publieeDepuis` accepts **1, 3, 7, 14 or 31 only**; anything else is a 400.
 * A window is rounded up to the next allowed value, never down: collecting a
 * few days too many is harmless, missing offers is not.
 */
const PUBLISHED_SINCE_VALUES = [1, 3, 7, 14, 31] as const;

export function publishedSinceParam(days: number): string | null {
  if (days <= 0) return null;

  const allowed =
    PUBLISHED_SINCE_VALUES.find((value) => value >= days) ??
    PUBLISHED_SINCE_VALUES[PUBLISHED_SINCE_VALUES.length - 1];

  return String(allowed);
}

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
  const publieeDepuis = publishedSinceParam(query.publishedSinceDays);

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
    ...(query.nafDivisions.length > 0 &&
    query.nafDivisions.length <= MAX_NAF_DIVISIONS
      ? { secteurActivite: query.nafDivisions.join(",") }
      : {}),
    ...(query.experienceLevel && EXPERIENCE_CODES[query.experienceLevel]
      ? { experience: EXPERIENCE_CODES[query.experienceLevel] }
      : {}),
    ...(publieeDepuis ? { publieeDepuis } : {}),
    range,
  };
}
