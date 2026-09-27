-- ATS scans: the landing's free score, and the score attached to a generated CV.
--
-- No CV text is stored, ever — not the uploaded file, not the extracted text,
-- not the pseudonymised version. `result` holds the scores and finding codes,
-- which are numbers and enum-like strings. There is deliberately no column a
-- CV's contents could land in: an anonymous visitor's CV must not become
-- personal data we hold (ADR-022).
--
-- The visitor's address is kept only as `ip_hash` = sha256(ip + secret), for
-- abuse forensics. The raw address is never written.
--
-- `email` stays NULL until the detailed report is unlocked. It is not a foreign
-- key to auth_accounts: a lead may unlock a report and never create an account,
-- and an account may be deleted while the scan is still within its retention
-- window. The link is a read-time join on the address.
CREATE TABLE IF NOT EXISTS "ats_scans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source" text NOT NULL,
  "locale" text DEFAULT 'fr' NOT NULL,
  "engine_version" text NOT NULL,
  "overall_score" integer NOT NULL,
  "result" jsonb NOT NULL,
  "ip_hash" text,
  "email" text,
  "unlocked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  CONSTRAINT "ats_scans_source_valid" CHECK ("source" in ('public', 'app')),
  CONSTRAINT "ats_scans_score_range" CHECK ("overall_score" between 0 and 100)
);
--> statement-breakpoint
-- Drives the retention purge, which scans by expiry alone.
CREATE INDEX IF NOT EXISTS "ats_scans_expires_idx" ON "ats_scans" ("expires_at");
--> statement-breakpoint
-- Lets a signed-in user find the reports they unlocked before signing up.
CREATE INDEX IF NOT EXISTS "ats_scans_email_idx" ON "ats_scans" ("email");
