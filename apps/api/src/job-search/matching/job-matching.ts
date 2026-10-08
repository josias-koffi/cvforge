import { SCORE_WEIGHTS, type ScoreBreakdown, type SearchProject } from "@cvforge/types";
import { fold } from "../../shared/text";
import type { StoredJob } from "../jobs.types";
import {
  romeSkillsMatch,
  romeTitleScore,
  type RomeScoringContext,
} from "./rome-matching";
import { salaryScore } from "./salary";

export { readYearlySalary } from "./salary";

/**
 * Deciding which offers a candidate is shown, and in what order.
 *
 * Two distinct steps, and the order matters. **Hard filters** answer "may this
 * offer be proposed at all" — a contract the candidate did not ask for, an
 * excluded company, a job 400 km away. Only what survives is **scored**, which
 * is a matter of degree.
 *
 * Everything here is pure: the morning run reads the database once and then
 * scores in memory, because a score depends on the candidate and there is
 * nothing to gain from asking Postgres the same question per candidate.
 */

const MS_PER_DAY = 86_400_000;
/**
 * The 30-day rule: nothing older is proposed, and the purge deletes what is
 * past it (US-169). One figure for both.
 */
export const DEFAULT_MAX_AGE_DAYS = 30;
/** Offers kept per candidate per morning. Ten is a readable e-mail. */
export const DEFAULT_SELECTION_SIZE = 10;
/** Below this, an offer is not worth a candidate's morning. */
export const DEFAULT_SCORE_THRESHOLD = 35;

export type RejectionReason =
  | "closed"
  | "too_old"
  | "contract"
  | "excluded_company"
  | "excluded_sector"
  | "location"
  | "already_proposed";

export interface EligibilityInput {
  job: StoredJob;
  project: SearchProject;
  now: number;
  maxAgeDays?: number;
  alreadyProposedJobIds?: ReadonlySet<string>;
}

/** Why an offer is not proposed, or `null` when it may be. */
export function rejectionReason(input: EligibilityInput): RejectionReason | null {
  const { job, project, now } = input;

  if (job.closedAt) return "closed";
  if (input.alreadyProposedJobIds?.has(job.id)) return "already_proposed";

  if (ageInDays(job, now) > (input.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS)) {
    return "too_old";
  }

  if (!contractAllowed(job, project)) return "contract";
  if (isExcludedCompany(job, project)) return "excluded_company";
  if (!locationAllowed(job, project)) return "location";

  return null;
}

/**
 * The age the 30-day rule reads: the oldest of "published at the source" and
 * "first collected by us". A source that hides its dates cannot make an offer
 * look fresher than the day we found it.
 */
export function ageInDays(job: StoredJob, now: number): number {
  const dates = [job.publishedAt, job.firstSeenAt]
    .map((value) => (value ? Date.parse(value) : Number.NaN))
    .filter((value) => Number.isFinite(value));
  const oldest = dates.length > 0 ? Math.min(...dates) : now;

  return Math.max(0, (now - oldest) / MS_PER_DAY);
}

/**
 * A contract the candidate did not ask for is never proposed.
 *
 * An offer whose contract could not be read ("unknown") is only proposed to
 * someone open to a permanent contract: sending a CDI to a candidate who wants
 * an internship is the mistake this feature cannot make.
 */
function contractAllowed(job: StoredJob, project: SearchProject): boolean {
  if (project.contractTypes.length === 0) return true;

  if (job.contractType === "unknown") return project.contractTypes.includes("cdi");

  return project.contractTypes.includes(job.contractType);
}

function isExcludedCompany(job: StoredJob, project: SearchProject): boolean {
  if (project.excludedCompanies.length === 0) return false;

  const company = fold(job.companyName);
  if (!company) return false;

  return project.excludedCompanies.some((excluded) => {
    const folded = fold(excluded);

    return Boolean(folded) && company.includes(folded);
  });
}

/** Remote work satisfies any location; otherwise the place has to fit. */
function locationAllowed(job: StoredJob, project: SearchProject): boolean {
  if (project.remote === "full_remote") return job.remote;
  if (job.remote) return true;
  if (project.nationalMobility || project.locations.length === 0) return true;

  return distanceScore(job, project) > 0;
}

export type { ScoreBreakdown };

export interface ScoredJob {
  job: StoredJob;
  score: number;
  breakdown: ScoreBreakdown;
  /**
   * What the candidate has: their own skills found in the advert, then the
   * offer's ROME competences their CV shows, required ones first.
   */
  matchedSkills: string[];
  /** The offer's ROME competences the CV does not show, required first. */
  missingSkills: string[];
  /** The direct signs that the offer is the candidate's trade (see `hasTradeEvidence`). */
  evidence: TradeEvidence;
}

export interface TradeEvidence {
  /** A word of the trade in the offer's title, 0 to 1. */
  title: number;
  /** The offer is one of the métiers the candidate confirmed. */
  romeMetier: boolean;
  /** Skills the candidate typed, found as whole words in the advert. */
  keywordSkills: number;
}

/** Two of the candidate's own skills in the advert; one could be chance. */
const MIN_KEYWORD_SKILLS = 2;

/**
 * Whether an offer is the candidate's trade, on direct evidence only, before
 * any context: place, freshness, experience and salary add up to 42 points
 * for any recent offer nearby, past the threshold on their own.
 *
 * The ROME competences read in a CV and the ROME domain only add to the
 * score. Measured on production data (jobspark-relevance, 2026-10-08), letting
 * them decide sent 59 % of out-of-trade offers through — "GPAO" read in a
 * software engineer's CV matched every machining offer; this rule lets 14 %
 * through and misses 8 % of the right ones.
 */
export function hasTradeEvidence({ evidence }: Pick<ScoredJob, "evidence">): boolean {
  return (
    evidence.title > 0 ||
    evidence.romeMetier ||
    evidence.keywordSkills >= MIN_KEYWORD_SKILLS
  );
}

export interface ScoreInput {
  job: StoredJob;
  project: SearchProject;
  /** `sections.technicalSkills` of the profile behind this search. */
  skills: readonly string[];
  now: number;
  /** Without it, the score reads keywords only, as before US-126. */
  rome?: RomeScoringContext;
}

export function scoreJob(input: ScoreInput): ScoredJob {
  const { job, project, now, rome } = input;
  const haystack = fold(`${job.title} ${job.description}`);
  const keywordSkills = matchSkills(haystack, input.skills);
  const romeSkills = rome
    ? romeSkillsMatch(job, rome)
    : { matched: [], missing: [], ratio: 0 };
  const titleWordsScore = titleScore(job, project);
  const romeTitle = romeTitleScore(job, rome?.projectCodes ?? []);
  const breakdown: ScoreBreakdown = {
    experience: SCORE_WEIGHTS.experience * experienceScore(job, project),
    freshness: SCORE_WEIGHTS.freshness * freshnessScore(job, now),
    location: SCORE_WEIGHTS.location * locationScore(job, project),
    salary: SCORE_WEIGHTS.salary * salaryScore(job, project),
    // The best of the two readings: ROME only ever adds to the keywords.
    skills:
      SCORE_WEIGHTS.skills *
      Math.max(
        input.skills.length > 0
          ? Math.min(1, keywordSkills.length / Math.min(5, input.skills.length))
          : 0,
        romeSkills.ratio,
      ),
    title:
      SCORE_WEIGHTS.title *
      Math.max(titleWordsScore, romeTitle),
  };

  return {
    breakdown,
    evidence: {
      keywordSkills: keywordSkills.length,
      romeMetier: romeTitle === 1,
      title: titleWordsScore,
    },
    job,
    matchedSkills: distinctFolded([...keywordSkills, ...romeSkills.matched]),
    missingSkills: romeSkills.missing,
    score: Math.round(
      Object.values(breakdown).reduce((total, points) => total + points, 0),
    ),
  };
}

/** "TypeScript" typed by the candidate and ROME's "Typescript" are one skill. */
function distinctFolded(labels: readonly string[]): string[] {
  const seen = new Set<string>();

  return labels.filter((label) => {
    const key = fold(label);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Words every trade's titles share: "Ingénieur DevOps" and "Ingénieur travaux"
 * have one in common, and it says nothing about the job.
 */
const GENERIC_TITLE_WORDS = new Set([
  "agent",
  "assistant",
  "charge",
  "chef",
  "confirme",
  "consultant",
  "directeur",
  "employe",
  "expert",
  "gestionnaire",
  "ingenieur",
  "junior",
  "lead",
  "manager",
  "operateur",
  "projet",
  "responsable",
  "senior",
  "technicien",
]);

/**
 * How much of a target job title the offer's own title carries. No target
 * title, no reading: the score then rests on skills and ROME alone.
 */
function titleScore(job: StoredJob, project: SearchProject): number {
  const title = new Set(titleWords(job.title));
  let best = 0;

  for (const role of project.targetRoles) {
    const words = titleWords(role);
    const specific = words.filter((word) => !GENERIC_TITLE_WORDS.has(word));
    // "Chef de projet" is all generic words: then all of them must be there.
    const telling = specific.length > 0 ? specific : words;
    if (!telling.some((word) => title.has(word))) continue;

    const found = words.filter((word) => title.has(word)).length;
    best = Math.max(best, found / words.length);
  }

  return best;
}

/** Whole words only, a plural read as its singular: "Ingénieurs" is "ingenieur". */
function titleWords(value: string): string[] {
  return fold(value)
    .split(" ")
    .filter((word) => word.length > 2)
    .map((word) => word.replace(/[sx]$/, ""));
}

/**
 * A skill counts when the advert names it as a whole word: "CI" is not in
 * "technicien", nor "Go" in "Google".
 */
function matchSkills(haystack: string, skills: readonly string[]): string[] {
  const padded = ` ${haystack} `;
  const found: string[] = [];

  for (const skill of skills) {
    const folded = fold(skill);
    if (folded.length < 2) continue;
    if (padded.includes(` ${folded} `)) found.push(skill);
  }

  return found;
}

/** The offer's own words about experience, against the level asked for. */
function experienceScore(job: StoredJob, project: SearchProject): number {
  if (!project.experienceLevel) return 0.5;

  const text = fold(`${job.title} ${job.description}`);
  const wantsJunior =
    project.experienceLevel === "debutant" || project.experienceLevel === "junior";
  const saysSenior = /\b(senior|confirme|expert|lead|principal)\b/.test(text);
  const saysJunior = /\b(junior|debutant|first experience|premiere experience)\b/.test(
    text,
  );

  if (wantsJunior) return saysSenior ? 0 : saysJunior ? 1 : 0.6;

  return saysSenior ? 1 : saysJunior ? 0.2 : 0.6;
}

/** Today is worth everything; the 30-day mark is worth nothing. */
function freshnessScore(job: StoredJob, now: number): number {
  const age = ageInDays(job, now);

  return Math.max(0, 1 - age / DEFAULT_MAX_AGE_DAYS);
}

function locationScore(job: StoredJob, project: SearchProject): number {
  if (job.remote) {
    return project.remote === "onsite" ? 0.5 : 1;
  }

  if (project.remote === "full_remote") return 0;

  return distanceScore(job, project);
}

/**
 * 1 at the candidate's doorstep, fading to 0 at the edge of the radius they
 * accepted. Coordinates when both sides have them, the department otherwise —
 * a board rarely gives more than a city name.
 */
function distanceScore(job: StoredJob, project: SearchProject): number {
  if (project.locations.length === 0 || project.nationalMobility) return 0.6;

  let best = 0;

  for (const location of project.locations) {
    if (
      job.latitude !== null &&
      job.longitude !== null &&
      location.latitude !== null &&
      location.longitude !== null
    ) {
      const distance = haversineKm(
        job.latitude,
        job.longitude,
        location.latitude,
        location.longitude,
      );

      if (distance <= location.radiusKm) {
        best = Math.max(best, 1 - (distance / location.radiusKm) * 0.5);
      }
      continue;
    }

    if (job.department && job.department === location.department) {
      best = Math.max(best, 0.8);
    }
  }

  return best;
}

const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLatitude = toRadians(latitudeB - latitudeA);
  const deltaLongitude = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(deltaLongitude / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export interface SelectionInput {
  jobs: readonly StoredJob[];
  project: SearchProject;
  skills: readonly string[];
  now: number;
  rome?: RomeScoringContext;
  alreadyProposedJobIds?: ReadonlySet<string>;
  limit?: number;
  threshold?: number;
  maxAgeDays?: number;
}

/** The offers of the day for one candidate, best first. */
export function selectJobsForProject(input: SelectionInput): ScoredJob[] {
  const eligible = input.jobs.filter(
    (job) =>
      rejectionReason({
        alreadyProposedJobIds: input.alreadyProposedJobIds,
        job,
        maxAgeDays: input.maxAgeDays,
        now: input.now,
        project: input.project,
      }) === null,
  );

  return eligible
    .map((job) =>
      scoreJob({
        job,
        now: input.now,
        project: input.project,
        rome: input.rome,
        skills: input.skills,
      }),
    )
    .filter(
      (scored) =>
        hasTradeEvidence(scored) &&
        scored.score >= (input.threshold ?? DEFAULT_SCORE_THRESHOLD),
    )
    .sort((left, right) => right.score - left.score)
    .slice(0, input.limit ?? DEFAULT_SELECTION_SIZE);
}
