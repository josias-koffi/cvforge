import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * The companies whose own job board we read every day.
 *
 * Unlike France Travail, an applicant tracking system cannot be searched: it
 * answers with one company's openings at a time. This registry *is* the
 * coverage of that half of the feature, which is why it fills itself from
 * three places — the Common Crawl index, the partner links carried by France
 * Travail offers, and the offers candidates import into their applications —
 * plus whatever an admin adds by hand.
 *
 * Not to be confused with the `ats_scans` table: that one is the CV scoring
 * feature. Here "board" always means a company's careers page.
 */
export const jobBoards = pgTable(
  "job_boards",
  {
    provider: text("provider").notNull(),
    /** How the provider names the company in its own URLs and API. */
    boardToken: text("board_token").notNull(),
    companyName: text("company_name").notNull().default(""),
    enabled: boolean("enabled").notNull().default(true),
    /** Where this company came from, to tell a guess from a certainty. */
    origin: text("origin").notNull(),
    lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
    lastStatus: text("last_status"),
    lastJobCount: integer("last_job_count").notNull().default(0),
    /** Reset on success. Past the threshold, the company is disabled. */
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("job_boards_provider_token_idx").on(
      table.provider,
      table.boardToken,
    ),
    // The daily collection reads the enabled rows, oldest fetch first.
    index("job_boards_enabled_idx").on(table.enabled, table.lastFetchedAt),
    check(
      "job_boards_origin_valid",
      sql`${table.origin} in ('seed', 'crawl', 'france_travail', 'user', 'admin')`,
    ),
  ],
);
