import {
  MARKET_MIN_SALARY_SAMPLE,
  MARKET_TENSION_LABELS,
  type MarketFigure,
  type MarketSalary,
  type MarketTensionLevel,
} from "@cvforge/types";
import { readYearlySalaryRange } from "../job-search/matching/salary";

/**
 * What the Marché du travail API answers, reduced to the figures the radar
 * shows (US-128). Shapes read live on 2026-09-24:
 *
 * - `stat-perspective-employeur`, nomenclature `TYPE_TENSION`: one line per
 *   year and per axis; `PERSPECTIVE` is the main tension, 1 to 5;
 * - `stat-offres`, nomenclature `ORIGINEOFF`: one line per quarter and per
 *   origin; `TOFF` counts every offer, `TOFF-CUMUL12MOIS` the last twelve months;
 * - `stat-demandeurs`, nomenclature `CATCAND`: one line per quarter and per
 *   category; `A` is the job seekers with no activity at all.
 *
 * The API has no salary per ROME job: `stat-salaires-en-poste` answers by
 * FAP family only, and the salary brackets of `stat-offres` come back empty.
 */

export interface IndicatorAnswer {
  listeValeursParPeriode?: Array<{
    codeNomenclature?: string;
    codePeriode?: string;
    libPeriode?: string;
    libActivite?: string;
    valeurPrincipaleNombre?: number | null;
  }>;
}

/** Everything the radar holds for one job in one department. */
export interface MarketReading {
  romeCode: string;
  department: string;
  romeLabel: string;
  region: string;
  tension: (MarketFigure & { value: MarketTensionLevel }) | null;
  offers: MarketFigure | null;
  offersYear: MarketFigure | null;
  jobseekers: MarketFigure | null;
  salary: MarketSalary | null;
}

export function readTension(
  answer: IndicatorAnswer | null,
): (MarketFigure & { value: MarketTensionLevel }) | null {
  const figure = latest(answer, "PERSPECTIVE");

  return figure && isTensionLevel(figure.value)
    ? { period: figure.period, value: figure.value }
    : null;
}

export function readOffers(answer: IndicatorAnswer | null): {
  offers: MarketFigure | null;
  offersYear: MarketFigure | null;
} {
  return {
    offers: latest(answer, "TOFF"),
    offersYear: latest(answer, "TOFF-CUMUL12MOIS"),
  };
}

export function readJobseekers(
  answer: IndicatorAnswer | null,
): MarketFigure | null {
  return latest(answer, "A");
}

/** The job's name as France Travail writes it, from whichever answer has one. */
export function readRomeLabel(
  ...answers: Array<IndicatorAnswer | null>
): string {
  for (const answer of answers) {
    const label = answer?.listeValeursParPeriode?.find(
      (line) => line.libActivite,
    )?.libActivite;
    if (label) return label;
  }

  return "";
}

/** The most recent period of one nomenclature. Codes sort: "2026T1" > "2025T4". */
function latest(
  answer: IndicatorAnswer | null,
  nomenclature: string,
): MarketFigure | null {
  let best: { code: string; figure: MarketFigure } | null = null;

  for (const line of answer?.listeValeursParPeriode ?? []) {
    if (line.codeNomenclature !== nomenclature) continue;
    if (typeof line.valeurPrincipaleNombre !== "number") continue;
    if (!line.codePeriode || !line.libPeriode) continue;
    if (best && best.code >= line.codePeriode) continue;

    best = {
      code: line.codePeriode,
      figure: { period: line.libPeriode, value: line.valeurPrincipaleNombre },
    };
  }

  return best?.figure ?? null;
}

function isTensionLevel(value: number): value is MarketTensionLevel {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

/** Outside this, a yearly figure is a misread label, not a salary. */
const PLAUSIBLE_YEARLY = { max: 300_000, min: 12_000 };
const FOREIGN_CURRENCY = /\$|£|usd|gbp|chf/i;

/**
 * The median of the salaries a set of offers state, each read at the middle
 * of its range. Offers paid in another currency, or whose label reads as an
 * implausible figure, are left out; too few left, and there is no median.
 */
export function medianSalary(
  labels: readonly string[],
  period: string,
): MarketSalary | null {
  const yearly = labels
    .filter((label) => !FOREIGN_CURRENCY.test(label))
    .map(readYearlySalaryRange)
    .flatMap((range) => (range ? [(range.low + range.high) / 2] : []))
    .filter(
      (value) =>
        value >= PLAUSIBLE_YEARLY.min && value <= PLAUSIBLE_YEARLY.max,
    )
    .sort((left, right) => left - right);

  // Below this, a median says more about three adverts than about a job.
  if (yearly.length < MARKET_MIN_SALARY_SAMPLE) return null;

  const middle = Math.floor(yearly.length / 2);
  const median =
    yearly.length % 2 === 1
      ? yearly[middle]!
      : (yearly[middle - 1]! + yearly[middle]!) / 2;

  // Rounded to the hundred: the figure is a landmark, not a payslip.
  return {
    medianYearly: Math.round(median / 100) * 100,
    period,
    sample: yearly.length,
  };
}

/** A third more or less offers over twelve months is news; less is noise. */
const NOTABLE_OFFERS_RATIO = 1 / 3;
/** Below this, "twice as many offers" is three instead of one. */
const MIN_OFFERS_FOR_CHANGE = 30;

/**
 * The line the morning e-mail repeats when a monthly refresh moves a figure
 * notably, or null. Only a new period can change anything: the API revises
 * nothing between two publications.
 */
export function notableChange(
  previous: MarketReading | null,
  next: MarketReading,
  departmentLabel: string,
): string | null {
  if (!previous) return null;

  const where = `${next.romeLabel || next.romeCode} en ${departmentLabel}`;
  const before = previous.tension;
  const after = next.tension;

  if (
    before &&
    after &&
    before.period !== after.period &&
    before.value !== after.value
  ) {
    return `${where} : la difficulté de recruter passe de ${MARKET_TENSION_LABELS[before.value]} à ${MARKET_TENSION_LABELS[after.value]} (${after.period}).`;
  }

  const from = previous.offersYear;
  const to = next.offersYear;

  if (
    from &&
    to &&
    from.period !== to.period &&
    Math.max(from.value, to.value) >= MIN_OFFERS_FOR_CHANGE &&
    Math.abs(to.value - from.value) >= from.value * NOTABLE_OFFERS_RATIO
  ) {
    const trend = to.value > from.value ? "hausse" : "baisse";

    return `${where} : offres en ${trend}, ${formatCount(to.value)} sur douze mois contre ${formatCount(from.value)} (${to.period}).`;
  }

  return null;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}
