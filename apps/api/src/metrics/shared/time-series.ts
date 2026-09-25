import type { MetricsBucket } from "@cvforge/types";
import { MS_PER_DAY, type ResolvedWindow } from "./metrics-window";

/** One aggregated row of a series, as the SQL answers it. */
export type BucketValue = { date: string; value: number };

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/** The first day of the bucket `date` falls in, UTC; weeks start on Monday. */
export function bucketStart(date: Date, bucket: MetricsBucket): Date {
  const day = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  if (bucket === "day") return day;
  if (bucket === "month") {
    return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1));
  }
  const sinceMonday = (day.getUTCDay() + 6) % 7;

  return new Date(day.getTime() - sinceMonday * MS_PER_DAY);
}

function nextBucket(date: Date, bucket: MetricsBucket): Date {
  if (bucket === "day") return new Date(date.getTime() + MS_PER_DAY);
  if (bucket === "week") return new Date(date.getTime() + 7 * MS_PER_DAY);

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

/**
 * Every bucket of the window, oldest first. The whole history has no start of
 * its own: it begins at the oldest data point, or today when there is none.
 */
export function bucketDates(
  window: ResolvedWindow,
  oldestData: string | null = null,
): string[] {
  const start =
    window.current.from ?? (oldestData ? new Date(oldestData) : window.now);
  const last = bucketStart(window.now, window.bucket);
  const dates: string[] = [];

  for (
    let cursor = bucketStart(start, window.bucket);
    cursor <= last;
    cursor = nextBucket(cursor, window.bucket)
  ) {
    dates.push(isoDay(cursor));
  }

  return dates;
}

/** The oldest date across several series' rows, for `bucketDates`. */
export function oldestDate(...series: BucketValue[][]): string | null {
  const dates = series.flat().map((row) => row.date).sort();

  return dates[0] ?? null;
}

/**
 * Lines several series up on the same buckets, with a zero wherever a bucket
 * had nothing: a missing day is a day at zero, not a gap the chart bridges.
 */
export function fillSeries<K extends string>(
  dates: string[],
  series: Record<K, BucketValue[]>,
): Array<{ date: string } & Record<K, number>> {
  const lookups = Object.entries(series).map(([key, rows]) => [
    key,
    new Map((rows as BucketValue[]).map((row) => [row.date, row.value])),
  ]) as Array<[K, Map<string, number>]>;

  return dates.map((date) => {
    const point = { date } as { date: string } & Record<K, number>;
    for (const [key, values] of lookups) {
      (point as Record<K, number>)[key] = values.get(date) ?? 0;
    }
    return point;
  });
}
