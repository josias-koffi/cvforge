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
