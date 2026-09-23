import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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
