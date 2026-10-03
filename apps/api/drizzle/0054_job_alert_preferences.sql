-- Alert preferences (US-166): on or off, threshold, rhythm. Null means the
-- defaults, which the code holds: alerts on, very close offers, immediately.
ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "job_alerts" jsonb;
