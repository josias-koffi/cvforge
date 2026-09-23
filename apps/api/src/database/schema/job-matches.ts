import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { jobs } from "./jobs";

/**
 * One offer proposed to one candidate, once.
 *
 * The unique key on (user, job) is the rule "never propose the same offer
 * twice" — it holds across sources, because it points at the deduplicated job
 * rather than at an advert.
 */
export const jobMatches = pgTable(
  "job_matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userEmail: text("user_email").notNull(),
    profileId: text("profile_id").notNull(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    digestDate: date("digest_date").notNull(),
    score: integer("score").notNull(),
    scoreBreakdown: jsonb("score_breakdown"),
    matchedSkills: jsonb("matched_skills").$type<string[]>().notNull().default([]),
    /** Rank the paid AI pass gave it, and its one-line explanation. */
    aiRank: integer("ai_rank"),
    aiReason: text("ai_reason"),
    status: text("status").notNull().default("new"),
    /** Set when the candidate turned the offer into an application. */
    applicationId: text("application_id"),
    /**
     * A copy of the offer as it was proposed. Kept so a saved or applied-to
     * offer survives the purge of `jobs`, which drops what nobody kept.
     */
    jobSnapshot: jsonb("job_snapshot"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("job_matches_user_job_idx").on(table.userEmail, table.jobId),
    index("job_matches_user_digest_idx").on(table.userEmail, table.digestDate),
    check(
      "job_matches_status_valid",
      sql`${table.status} in ('new', 'seen', 'saved', 'dismissed', 'applied')`,
    ),
    check("job_matches_score_range", sql`${table.score} between 0 and 100`),
  ],
);

/**
 * One run of the morning collection, and the lock that makes it happen once.
 *
 * `run_date` is unique, so two API instances starting the same morning race on
 * the insert and exactly one wins — the same trick the repo already uses to
 * keep daily work idempotent, without a job queue.
 */
export const jobDigestRuns = pgTable("job_digest_runs", {
  runDate: date("run_date").primaryKey(),
  status: text("status").notNull().default("running"),
  stats: jsonb("stats"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});
