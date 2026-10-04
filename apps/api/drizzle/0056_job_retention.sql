-- Retention of the offers (US-169). A closed advert loses its recruiter's
-- contact and its company fields at once; `anonymized_at` says it was done, so
-- the daily pass only rewrites what is left. A job is anonymized once every
-- one of its adverts is closed.
ALTER TABLE "job_listings" ADD COLUMN IF NOT EXISTS "anonymized_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "anonymized_at" timestamp with time zone;
--> statement-breakpoint
-- The daily pass's queue: closed adverts not anonymized yet.
CREATE INDEX IF NOT EXISTS "job_listings_to_anonymize_idx" ON "job_listings" ("job_id") WHERE "closed_at" IS NOT NULL AND "anonymized_at" IS NULL;
--> statement-breakpoint
-- The purge keeps a job an active application points to.
CREATE INDEX IF NOT EXISTS "job_matches_application_idx" ON "job_matches" ("application_id") WHERE "application_id" IS NOT NULL;
--> statement-breakpoint
-- The purge takes the collection's lock: a row of its own kind.
ALTER TABLE "job_digest_runs" DROP CONSTRAINT IF EXISTS "job_digest_runs_kind_check";
--> statement-breakpoint
ALTER TABLE "job_digest_runs" ADD CONSTRAINT "job_digest_runs_kind_check" CHECK ("kind" in ('digest', 'collect', 'purge'));
