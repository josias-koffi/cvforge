import type { RomeAppellationOption } from "./rome";

/**
 * The labour market around a candidate's job (US-128): how hard employers find
 * it to recruit, how many offers and job seekers, and what offers pay. Read
 * once a month from France Travail's Marché du travail API, never on a page
 * view, and always shown with its period and its source.
 */

/** France Travail's own scale, from 1 (très faible) to 5 (très élevée). */
export type MarketTensionLevel = 1 | 2 | 3 | 4 | 5;

export const MARKET_TENSION_LABELS: Record<MarketTensionLevel, string> = {
  1: "très faible",
  2: "faible",
  3: "moyenne",
  4: "élevée",
  5: "très élevée",
};

/** A figure and the period France Travail measured it on ("1er trimestre 2026"). */
export interface MarketFigure {
  value: number;
  period: string;
}

export interface MarketSalary {
  /** Gross yearly, in euros: the median of the ranges the offers state. */
  medianYearly: number;
  /** How many offers stated a salary it could read. */
  sample: number;
  period: string;
}

export interface MarketDepartmentStats {
  department: string;
  departmentLabel: string;
  /** Recruitment difficulty, France Travail's main tension indicator. */
  tension: (MarketFigure & { value: MarketTensionLevel }) | null;
  /** Every offer published for the job, France Travail's and its partners'. */
  offers: MarketFigure | null;
  /** The same, over the twelve months ending with that quarter. */
  offersYear: MarketFigure | null;
  /** Job seekers in category A looking for this job. */
  jobseekers: MarketFigure | null;
  /** Read from the offers CVSpark collected, not from the API: it has none per job. */
  salary: MarketSalary | null;
}

export interface MarketRadarEntry {
  romeCode: string;
  romeLabel: string;
  local: MarketDepartmentStats;
  /** The department of the same region with the most offers, when it beats `local`. */
  bestNeighbour: MarketDepartmentStats | null;
  /** When the figures were read, ISO. */
  refreshedAt: string;
}

/** The attribution shown wherever Marché du travail figures appear. */
export const MARKET_SOURCE_LABEL = "Source : Marché du travail, France Travail";

/** The salary comes from our own collection; saying so is not optional. */
export const MARKET_SALARY_SOURCE_LABEL =
  "Salaires : offres collectées par CVSpark";

/** Below this many offers stating a salary, no median is shown (US-137). */
export const MARKET_MIN_SALARY_SAMPLE = 5;

/**
 * What the free job market tool returns for one ROME job in one department
 * (US-137). `collecting` means the pair was never read: it is queued for the
 * next monthly refresh, and nothing was asked of France Travail meanwhile.
 */
export type PublicJobMarketResponse = {
  appellation: RomeAppellationOption;
  department: string;
  departmentLabel: string;
  status: "ready" | "collecting";
  stats: Omit<MarketDepartmentStats, "department" | "departmentLabel"> | null;
  /** When the figures were read, ISO; null while collecting. */
  refreshedAt: string | null;
  salaryMinSample: number;
};

/** One job × department page of the landing (US-138). */
export interface MarketPageLink {
  romeCode: string;
  romeLabel: string;
  department: string;
  departmentLabel: string;
}

export interface MarketPageEntry extends MarketPageLink {
  /** When the figures were read, ISO: the sitemap's `lastModified`. */
  refreshedAt: string;
}

/**
 * Everything a job × department page shows (US-138). Only served for a pair
 * with a published tension and a yearly offer count: no page without data.
 */
export interface PublicMarketPage extends MarketPageEntry {
  stats: Omit<MarketDepartmentStats, "department" | "departmentLabel">;
  salaryMinSample: number;
  /** The ROME appellations the job covers, shortest first. */
  appellations: RomeAppellationOption[];
  /** The appellation the "every morning" link confirms, or null without one. */
  leadAppellationCode: string | null;
  /** The same job in the region's other departments that have a page. */
  neighbours: MarketPageLink[];
  /** Other jobs of the department that have a page, most offers first. */
  otherJobs: MarketPageLink[];
}
