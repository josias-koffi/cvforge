import type { SearchProject } from "@cvforge/types";
import type { StoredJob } from "../jobs.types";

const HOURS_PER_WEEK = 35;
const WEEKS_PER_YEAR = 52;
const MONTHS_PER_YEAR = 12;

/**
 * A bonus, never a filter: most adverts hide the salary, and filtering on it
 * would drop the offers that simply did not say.
 */
export function salaryScore(job: StoredJob, project: SearchProject): number {
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
 *
 * A range ("de 45000 à 55000") is read at its top: it is what the candidate is
 * being offered at best, and the low end filters nobody out usefully.
 */
export function readYearlySalary(label: string): number | null {
  return readYearlySalaryRange(label)?.high ?? null;
}

/**
 * Both ends of the salary a label states, yearly; a single figure gives the
 * same low and high. The market radar takes the middle (US-128): a median of
 * tops would say every job pays its best.
 */
export function readYearlySalaryRange(
  label: string,
): { low: number; high: number } | null {
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

  const low = Math.min(...numbers);
  const high = Math.max(...numbers);
  const yearly = (value: number) => value * yearlyFactor(text, hourly, high);

  return { high: yearly(high), low: yearly(low) };
}

function yearlyFactor(text: string, hourly: boolean, highest: number): number {
  if (hourly) return HOURS_PER_WEEK * WEEKS_PER_YEAR;
  if (/\bannuel|annual|par an\b|\/\s?an\b|per year\b/.test(text)) return 1;
  if (/\bmensuel|par mois\b|\/\s?mois\b|per month\b/.test(text)) {
    return MONTHS_PER_YEAR;
  }

  // No period stated: in France a four-figure salary is a monthly one.
  return highest < 10_000 ? MONTHS_PER_YEAR : 1;
}
