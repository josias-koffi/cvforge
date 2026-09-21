-- The interview gains a length and a plan, and the recruiter finally gets to
-- know what job it is interviewing for.
--
-- `duration_minutes` drives the agenda, which spreads its phases over it, so
-- it decides how much ground an interview covers rather than only when it
-- stops. Existing rows take the 10-minute default from vision §10.5.
--
-- `started_at` is stamped on the first spoken turn rather than at creation:
-- credits are spent when the session opens, sometimes minutes before anyone
-- reaches the studio, and that gap must not eat into the interview.
--
-- `context` freezes the offer and the candidate at session start. Reading them
-- per turn would put a database round trip on the critical path of a turn
-- budgeted at a second, and an offer edited mid-interview would change the
-- questions being asked.
ALTER TABLE "interview_sessions" ADD COLUMN IF NOT EXISTS "duration_minutes" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD COLUMN IF NOT EXISTS "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD COLUMN IF NOT EXISTS "context" jsonb;--> statement-breakpoint
-- Derived from the offer the first time an interview asks for it, then cached.
-- Generating it for every application would charge for something most of them
-- never use. Null means "not derived yet", which is why there is no default.
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "company_context" jsonb;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "company_context_generated_at" timestamp with time zone;
