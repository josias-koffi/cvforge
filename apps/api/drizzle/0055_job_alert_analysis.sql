-- Paid AI analysis of the alerts (US-168). The analysis sits beside the
-- offer, in its own column: the offer's content is never altered. The status
-- says why an alert went without one (no credit, daily cap, failed call).
ALTER TABLE "job_matches" ADD COLUMN IF NOT EXISTS "ai_analysis" jsonb;
--> statement-breakpoint
ALTER TABLE "job_matches" ADD COLUMN IF NOT EXISTS "ai_analysis_status" text;
--> statement-breakpoint
ALTER TABLE "job_matches" ADD COLUMN IF NOT EXISTS "ai_analysis_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "job_matches" DROP CONSTRAINT IF EXISTS "job_matches_ai_analysis_status_valid";
--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_ai_analysis_status_valid" CHECK ("ai_analysis_status" is null or "ai_analysis_status" in ('done', 'no_credit', 'capped', 'failed'));
--> statement-breakpoint
-- The enricher's queue: fresh alerts not analysed yet.
CREATE INDEX IF NOT EXISTS "job_matches_alert_to_analyse_idx" ON "job_matches" ("detected_at") WHERE "kind" = 'alert' AND "ai_analysis_status" IS NULL AND "alert_sent_at" IS NULL;
--> statement-breakpoint
-- What the alert's analysis said to bring forward, carried to the application
-- so the CV and the letter use it without a new call.
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "points_to_highlight" jsonb DEFAULT '[]'::jsonb NOT NULL;
