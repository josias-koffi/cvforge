-- The day was the primary key of a run, which made three things impossible.
--
-- There could be at most one row per day, so no history: a manual collection
-- overwrote the morning's statistics. A forced run released the day and took
-- it again, so two collections could run at once and fight over the same
-- offers. And a run interrupted by a restart stayed `running` for ever,
-- blocking the day's collection with no way back.
--
-- A run now has its own identity, and two partial unique indexes carry what
-- the primary key used to: one morning selection per day, and one collection
-- running at a time. Enforced by the database, not by a variable in memory,
-- because the API can run several instances.

-- Nothing is running: the process that owned these rows is long gone. Doing
-- this first also lets the index below be created at all.
UPDATE "job_digest_runs" SET "status" = 'failed', "finished_at" = now() WHERE "status" = 'running';
--> statement-breakpoint
ALTER TABLE "job_digest_runs" DROP CONSTRAINT IF EXISTS "job_digest_runs_pkey";
--> statement-breakpoint
ALTER TABLE "job_digest_runs" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "job_digest_runs" ADD CONSTRAINT "job_digest_runs_pkey" PRIMARY KEY ("id");
--> statement-breakpoint
-- A `digest` run selects and notifies afterwards, a `collect` run stops once
-- the offers are stored. The admin button only ever asks for the second.
ALTER TABLE "job_digest_runs" ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'digest' NOT NULL;
--> statement-breakpoint
ALTER TABLE "job_digest_runs" ADD CONSTRAINT "job_digest_runs_kind_check" CHECK ("kind" in ('digest', 'collect'));
--> statement-breakpoint
ALTER TABLE "job_digest_runs" ALTER COLUMN "run_date" SET NOT NULL;
--> statement-breakpoint
-- One morning selection per day, whatever else ran that day.
CREATE UNIQUE INDEX IF NOT EXISTS "job_digest_runs_day_idx" ON "job_digest_runs" ("run_date") WHERE "kind" = 'digest';
--> statement-breakpoint
-- One collection at a time: every running row carries the same status value,
-- so uniqueness on it allows exactly one.
CREATE UNIQUE INDEX IF NOT EXISTS "job_digest_runs_running_idx" ON "job_digest_runs" ("status") WHERE "status" = 'running';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_digest_runs_recent_idx" ON "job_digest_runs" ("started_at" DESC);
