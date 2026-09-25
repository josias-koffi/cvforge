import {
  DEFAULT_METRICS_PERIOD,
  isMetricsPeriod,
  type Kpi,
  type MetricsBucket,
  type MetricsPeriod,
  type MetricsWindow,
} from "@cvforge/types";

export const MS_PER_DAY = 86_400_000;
/** Beyond 90 points a day each, a chart turns into noise: weeks, then months. */
const LONGEST_DAILY_PERIOD = 90;

/** A half-open time range, [from, to). A null bound is unbounded. */
export type Range = { from: Date | null; to: Date | null };

/** A period resolved against a clock: what every store and service reads. */
export type ResolvedWindow = {
  period: MetricsPeriod;
  days: number | null;
  current: Range;
  /** The same length just before; null for the whole history. */
  previous: Range | null;
  bucket: MetricsBucket;
  now: Date;
};

/** Anything but a known period falls back to the default, never a 400. */
export function parsePeriod(raw: unknown): MetricsPeriod {
  return isMetricsPeriod(raw) ? raw : DEFAULT_METRICS_PERIOD;
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * "7 days" is today and the six before it, from midnight UTC: the series then
 * has exactly seven points, and the previous period is the seven days before.
 */
export function resolveWindow(
  period: MetricsPeriod,
  now: Date = new Date(),
): ResolvedWindow {
  if (period === "all") {
    return {
      bucket: "month",
      current: { from: null, to: null },
      days: null,
      now,
      period,
      previous: null,
    };
  }

  const days = Number(period);
  const since = new Date(startOfUtcDay(now).getTime() - (days - 1) * MS_PER_DAY);

  return {
    bucket: days <= LONGEST_DAILY_PERIOD ? "day" : "week",
    current: { from: since, to: null },
    days,
    now,
    period,
    previous: { from: new Date(since.getTime() - days * MS_PER_DAY), to: since },
  };
}

export function toWindowDto(window: ResolvedWindow): MetricsWindow {
  return {
    bucket: window.bucket,
    generatedAt: window.now.toISOString(),
    period: window.period,
    previousSince: window.previous?.from?.toISOString() ?? null,
    since: window.current.from?.toISOString() ?? null,
  };
}

/**
 * Reads a figure over the current period and, when there is one, the
 * previous: the two reads run together.
 */
export async function readKpi(
  window: ResolvedWindow,
  read: (range: Range) => Promise<number>,
): Promise<Kpi> {
  const [value, previous] = await Promise.all([
    read(window.current),
    window.previous ? read(window.previous) : Promise.resolve(null),
  ]);

  return { previous, value };
}

/** A share in percent, rounded; null when there is nothing to divide by. */
export function percent(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;
}

/** Days actually covered by a range, at least one. */
export function rangeDays(range: Range, now: Date, fallbackFrom: Date | null) {
  const from = range.from ?? fallbackFrom;
  if (!from) return null;
  const to = range.to ?? now;

  return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / MS_PER_DAY));
}
