import type { SearchProject } from "@cvforge/types";
import { fold } from "../../shared/text";
import type { StoredJob } from "../jobs.types";

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
const HOURS_PER_WEEK = 35;
const WEEKS_PER_YEAR = 52;
const MONTHS_PER_YEAR = 12;
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

export interface ScoreBreakdown {
  title: number;
  skills: number;
  experience: number;
  location: number;
  freshness: number;
  salary: number;
}

export interface ScoredJob {
  job: StoredJob;
  score: number;
  breakdown: ScoreBreakdown;
  /** The candidate's own skills found in the advert, for the explanation. */
  matchedSkills: string[];
}

/**
 * Weights, as a share of the 100 points.
 *
 * Sector and company values are deliberately absent: they need a company's NAF
 * code and Egapro index, which arrive with the company sheet (E19 phase 2).
 * Adding them as always-zero dimensions would quietly cap every score at 85.
 */
const WEIGHTS: ScoreBreakdown = {
  experience: 10,
  freshness: 15,
  location: 15,
  salary: 5,
  skills: 25,
  title: 30,
};

export interface ScoreInput {
  job: StoredJob;
  project: SearchProject;
  /** `sections.technicalSkills` of the profile behind this search. */
  skills: readonly string[];
  now: number;
}

export function scoreJob(input: ScoreInput): ScoredJob {
  const { job, project, now } = input;
  const haystack = fold(`${job.title} ${job.description}`);
  const matchedSkills = matchSkills(haystack, input.skills);
  const breakdown: ScoreBreakdown = {
    experience: WEIGHTS.experience * experienceScore(job, project),
    freshness: WEIGHTS.freshness * freshnessScore(job, now),
    location: WEIGHTS.location * locationScore(job, project),
    salary: WEIGHTS.salary * salaryScore(job, project),
    skills:
      WEIGHTS.skills *
      (input.skills.length > 0
        ? Math.min(1, matchedSkills.length / Math.min(5, input.skills.length))
        : 0),
    title: WEIGHTS.title * titleScore(job, project),
  };

  return {
    breakdown,
    job,
    matchedSkills,
    score: Math.round(
      Object.values(breakdown).reduce((total, points) => total + points, 0),
    ),
  };
}

/** How much of a target job title the offer's own title carries. */
function titleScore(job: StoredJob, project: SearchProject): number {
  if (project.targetRoles.length === 0) return 0.5;

  const title = fold(job.title);
  let best = 0;

  for (const role of project.targetRoles) {
    const words = fold(role).split(" ").filter((word) => word.length > 2);
    if (words.length === 0) continue;

    const found = words.filter((word) => title.includes(word)).length;
    best = Math.max(best, found / words.length);
  }

  return best;
}

function matchSkills(haystack: string, skills: readonly string[]): string[] {
  const found: string[] = [];

  for (const skill of skills) {
    const folded = fold(skill);
    if (folded.length < 2) continue;
    if (haystack.includes(folded)) found.push(skill);
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

/**
 * A bonus, never a filter: most adverts hide the salary, and filtering on it
 * would drop the offers that simply did not say.
 */
function salaryScore(job: StoredJob, project: SearchProject): number {
  if (!project.salaryMinYearly) return 0.5;
  if (!job.salaryLabel) return 0.5;

  const yearly = readYearlySalary(job.salaryLabel);
  if (yearly === null) return 0.5;

  return yearly >= project.salaryMinYearly ? 1 : 0;
}

/**
 * Reads a salary label into a yearly figure.
 *
 * France Travail writes "Annuel de 45000,00 Euros à 55000,00 Euros sur 12
 * mois", a board writes "45 000 € / an" or "3 000 € par mois". Three traps:
 * the decimal comma, the thousands space, and "sur 12 mois" — which ends an
 * **annual** label and must not be read as a monthly one.
 *
 * Anything unreadable returns null, which scores neutral. Inventing a figure
 * would filter offers on a number nobody wrote.
 */
export function readYearlySalary(label: string): number | null {
  const text = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    // "sur 12 mois" qualifies the annual total, not the period.
    .replace(/sur\s+\d+\s+mois/g, " ");

  const cleaned = text
    // Thousands separator: a space or a dot before exactly three digits.
    .replace(/(\d)[\s.](?=\d{3}\b)/g, "$1")
    // Decimals, which carry nothing here.
    .replace(/(\d)[.,]\d{1,2}\b/g, "$1");

  const hourly = /\bhoraire|heure|\/\s?h\b|per hour\b/.test(text);
  const numbers = [...cleaned.matchAll(/\d+/g)]
    .map((match) => Number(match[0]))
    // An hourly rate is a two-figure number; anywhere else a number under 100
    // is "35 heures" or "12 mois", never a salary.
    .filter((value) => (hourly ? value >= 5 && value <= 500 : value >= 100));
  if (numbers.length === 0) return null;

  // A range ("de 45000 à 55000") is read at its top: it is what the candidate
  // is being offered at best, and the low end filters nobody out usefully.
  const highest = Math.max(...numbers);

  if (hourly) return highest * HOURS_PER_WEEK * WEEKS_PER_YEAR;
  if (/\bannuel|annual|par an\b|\/\s?an\b|per year\b/.test(text)) return highest;
  if (/\bmensuel|par mois\b|\/\s?mois\b|per month\b/.test(text)) {
    return highest * MONTHS_PER_YEAR;
  }

  // No period stated: in France a four-figure salary is a monthly one.
  return highest < 10_000 ? highest * MONTHS_PER_YEAR : highest;
}

export interface SelectionInput {
  jobs: readonly StoredJob[];
  project: SearchProject;
  skills: readonly string[];
  now: number;
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
      scoreJob({ job, now: input.now, project: input.project, skills: input.skills }),
    )
    .filter((scored) => scored.score >= (input.threshold ?? DEFAULT_SCORE_THRESHOLD))
    .sort((left, right) => right.score - left.score)
    .slice(0, input.limit ?? DEFAULT_SELECTION_SIZE);
}
