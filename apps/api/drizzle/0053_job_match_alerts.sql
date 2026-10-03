-- Matching as offers arrive (ADR-027, US-165).
--
-- A match is now either the morning's (`digest`) or an alert raised by the
-- continuous collection (`alert`). An alert carries the publication date at
-- the source and the time we detected the offer, so the delay between the
-- two can be measured per source. It only keeps the offer out of the next
-- morning once it was actually sent (`alert_sent_at`).
ALTER TABLE "job_matches" ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'digest' NOT NULL;
--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_kind_valid" CHECK ("kind" in ('digest', 'alert'));
--> statement-breakpoint
ALTER TABLE "job_matches" ADD COLUMN IF NOT EXISTS "source" text;
--> statement-breakpoint
ALTER TABLE "job_matches" ADD COLUMN IF NOT EXISTS "published_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "job_matches" ADD COLUMN IF NOT EXISTS "detected_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "job_matches" ADD COLUMN IF NOT EXISTS "alert_sent_at" timestamp with time zone;
--> statement-breakpoint
-- The cockpit reads the alerts of a period, per source.
CREATE INDEX IF NOT EXISTS "job_matches_alert_created_idx" ON "job_matches" ("created_at") WHERE "kind" = 'alert';
