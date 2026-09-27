import type { AtsScoreResult } from "@cvforge/ats-score";
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * One row per ATS scan.
 *
 * **No CV text is ever stored here** — not the file, not the extracted text,
 * not even the pseudonymised version. `result` holds numbers and finding
 * codes, nothing else. That is what keeps a scan by an anonymous visitor out
 * of DPIA territory, and there is deliberately no column such a text could
 * land in (ADR-022).
 *
 * `email` stays null until the visitor unlocks the detailed report; the link
 * to an account is a read-time join on the address, never a foreign key, so
 * neither side owns the other.
 */
export const atsScans = pgTable(
  "ats_scans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: text("source").$type<"public" | "app">().notNull(),
    locale: text("locale").notNull().default("fr"),
    engineVersion: text("engine_version").notNull(),
    overallScore: integer("overall_score").notNull(),
    result: jsonb("result").$type<AtsScoreResult>().notNull(),
    /** sha256(ip + secret). The raw address is never written. */
    ipHash: text("ip_hash"),
    email: text("email"),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Purged past this point by `AtsPurgeService` (US-103). */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("ats_scans_expires_idx").on(table.expiresAt),
    index("ats_scans_email_idx").on(table.email),
    check(
      "ats_scans_source_valid",
      sql`${table.source} in ('public', 'app')`,
    ),
    check(
      "ats_scans_score_range",
      sql`${table.overallScore} between 0 and 100`,
    ),
  ],
);
