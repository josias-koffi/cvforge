import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Whether a source is switched on, and what its last run gave.
 *
 * Two different questions, deliberately kept apart: the **environment** decides
 * availability — a source without credentials is inert whatever this table
 * says — and this table decides **activation**, so a misbehaving source can be
 * silenced without a redeploy.
 *
 * ATS providers have a row here too, next to the global sources: silencing a
 * whole provider is one switch, while `job_boards.enabled` stays the setting
 * for a single company.
 */
export const jobSources = pgTable("job_sources", {
  source: text("source").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastStatus: text("last_status"),
  lastListingCount: integer("last_listing_count").notNull().default(0),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Where the continuous collection of a source stands (ADR-027): the end of the
 * last slice read successfully, and the lease that keeps a single instance
 * reading. Nothing else: the offers themselves go where the daily pass puts them.
 */
export const jobStreamCursors = pgTable("job_stream_cursors", {
  source: text("source").primaryKey(),
  cursorAt: timestamp("cursor_at", { withTimezone: true }),
  lockedBy: text("locked_by"),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  /** What the last pass did, for the admin screen (US-164). */
  lastReport: jsonb("last_report").$type<Record<string, unknown>>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Calls made to a source on a day (Paris time), for the admin's quota view. */
export const jobSourceCalls = pgTable(
  "job_source_calls",
  {
    source: text("source").notNull(),
    day: date("day", { mode: "string" }).notNull(),
    calls: integer("calls").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.source, table.day] })],
);
