-- Applications untouched for a year are deleted (US-170), 15 days after the
-- candidate was warned. `deletion_warned_at` dates that warning; a change made
-- since (a later `updated_at`) cancels it.
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "deletion_warned_at" timestamp with time zone;
--> statement-breakpoint
-- One row per real pass: what it warned and deleted. The daily pass only
-- starts once a first pass was launched by hand (`applications:purge`).
CREATE TABLE IF NOT EXISTS "application_retention_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ran_at" timestamp with time zone DEFAULT now() NOT NULL,
  "stats" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_preferences" ALTER COLUMN "email" SET DEFAULT '{"applicationFollowUp": true, "applicationDeletionWarning": true, "creditPurchaseConfirmed": true, "jobDigest": true}'::jsonb;
