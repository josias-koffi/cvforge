import { and, gte, lt, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { MetricsBucket } from "@cvforge/types";
import type { Range } from "./metrics-window";

/** Aggregates answer numeric strings, or null on an empty set. */
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;

  return typeof value === "number" ? value : Number.parseFloat(value) || 0;
}

/** `column` within the range; undefined (no filter) for an unbounded one. */
export function inRange(column: AnyPgColumn, range: Range): SQL | undefined {
  return and(
    range.from ? gte(column, range.from) : undefined,
    range.to ? lt(column, range.to) : undefined,
  );
}

/** The same for a `date` column, compared as ISO days. */
export function dayInRange(column: AnyPgColumn, range: Range): SQL | undefined {
  const day = (date: Date) => date.toISOString().slice(0, 10);

  return and(
    range.from ? gte(column, day(range.from)) : undefined,
    range.to ? lt(column, day(range.to)) : undefined,
  );
}

const BUCKETS: Record<MetricsBucket, SQL> = {
  day: sql.raw("'day'"),
  month: sql.raw("'month'"),
  week: sql.raw("'week'"),
};

/**
 * The bucket a timestamp falls in, as the ISO day it starts on. Read in UTC,
 * like the window: a point must not move with the server's time zone. A
 * `date` column has no zone, so it is truncated as it is.
 */
export function bucketOf(
  column: AnyPgColumn,
  bucket: MetricsBucket,
  kind: "timestamp" | "date" = "timestamp",
): SQL<string> {
  const value =
    kind === "date"
      ? sql`${column}::timestamp`
      : sql`(${column} at time zone 'UTC')`;

  return sql<string>`to_char(date_trunc(${BUCKETS[bucket]}, ${value}), 'YYYY-MM-DD')`;
}
