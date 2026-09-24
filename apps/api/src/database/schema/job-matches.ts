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
    /** The offer's ROME competences the CV does not show, required first. */
    missingSkills: jsonb("missing_skills").$type<string[]>().notNull().default([]),
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
 * One run of the collection, and the two locks that keep it sane.
 *
 * A run has its own identity, so the table is a history: a collection asked
 * for by hand no longer overwrites the morning's figures. Two partial unique
 * indexes carry what the primary key used to:
 *
 * - **one morning selection per day**, whatever else ran that day;
 * - **one collection running at a time** — every running row carries the same
 *   status value, so uniqueness on it allows exactly one.
 *
 * Both are enforced by the database rather than by a variable in memory,
 * because the API can run several instances. No job queue, as everywhere else
 * in this repo.
 */
export const jobDigestRuns = pgTable(
  "job_digest_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runDate: date("run_date").notNull(),
    /** `digest` selects and notifies afterwards; `collect` stops at storing. */
    kind: text("kind").notNull().default("digest"),
    status: text("status").notNull().default("running"),
    stats: jsonb("stats"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("job_digest_runs_day_idx")
      .on(table.runDate)
      .where(sql`${table.kind} = 'digest'`),
    uniqueIndex("job_digest_runs_running_idx")
      .on(table.status)
      .where(sql`${table.status} = 'running'`),
    index("job_digest_runs_recent_idx").on(sql`${table.startedAt} desc`),
    check("job_digest_runs_kind_check", sql`${table.kind} in ('digest', 'collect')`),
  ],
);
