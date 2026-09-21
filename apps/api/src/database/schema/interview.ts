import type {
  InterviewAIStatus,
  InterviewContextSnapshot,
  InterviewMessage,
  InterviewRecruiterProfile,
  InterviewReport,
  InterviewSessionStatus,
  InterviewTranscriptChunk,
  Locale,
} from "@cvforge/types";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * One row per mock-interview session. Messages and the report stay `jsonb`:
 * both are read and written whole. The audio transcript chunks are not — they
 * are appended one at a time as the interview runs, there can be dozens per
 * session, and they carry most of the payload — so they live in their own
 * table below.
 */
export const interviewSessions = pgTable(
  "interview_sessions",
  {
    id: text("id").primaryKey(),
    userEmail: text("user_email").notNull(),
    applicationId: text("application_id"),
    status: text("status").$type<InterviewSessionStatus>().notNull(),
    aiStatus: text("ai_status").$type<InterviewAIStatus>().notNull(),
    aiResponse: text("ai_response"),
    aiResponseGeneratedAt: timestamp("ai_response_generated_at", {
      withTimezone: true,
    }),
    language: text("language").$type<Locale>().notNull().default("fr"),
    profile: text("profile").$type<InterviewRecruiterProfile>().notNull(),
    prefetchedQuestion: text("prefetched_question"),
    transcript: text("transcript").notNull().default(""),
    messages: jsonb("messages").$type<InterviewMessage[]>().notNull().default([]),
    report: jsonb("report").$type<InterviewReport | null>(),
    lastError: text("last_error"),
    recoverable: boolean("recoverable").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(10),
    // Set on the first spoken turn, not at creation: credits are spent when
    // the session opens, which can be minutes before anyone reaches the
    // studio, and the agenda must not burn its budget on that gap.
    startedAt: timestamp("started_at", { withTimezone: true }),
    context: jsonb("context").$type<InterviewContextSnapshot | null>(),
  },
  (table) => [
    // History reads by user, newest first. With `user_email` leading, this
    // also covers every lookup by user alone, so there is no separate
    // single-column index to pay for on each `save()`.
    index("interview_sessions_user_created_idx").on(
      table.userEmail,
      table.createdAt.desc(),
    ),
    // The retention purge scans by completion date.
    index("interview_sessions_completed_idx").on(table.completedAt),
  ],
);

export const interviewChunks = pgTable(
  "interview_chunks",
  {
    sessionId: text("session_id")
      .notNull()
      .references(() => interviewSessions.id, { onDelete: "cascade" }),
    chunkId: text("chunk_id").notNull(),
    sequence: integer("sequence").notNull(),
    status: text("status")
      .$type<InterviewTranscriptChunk["status"]>()
      .notNull(),
    transcript: text("transcript").notNull().default(""),
    mimeType: text("mime_type").notNull().default("audio/webm"),
    isFinal: boolean("is_final").notNull().default(false),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  // Chunks are only ever read as one session's ordered run. Not unique: the
  // file store defaulted a missing `sequence` to 0, so legacy rows can collide
  // and a constraint here would block the rollout on data the app accepted.
  (table) => [
    index("interview_chunks_session_sequence_idx").on(
      table.sessionId,
      table.sequence,
    ),
  ],
);
