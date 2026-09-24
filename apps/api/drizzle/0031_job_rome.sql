-- The ROME job each offer is filed under (US-124, ADR-024). France Travail
-- gives the code and the appellation's label on every offer, and the skills
-- on a fifth to two fifths of them (measured 2026-09-24); La bonne alternance
-- gives the codes. The score by ROME (US-126) reads them from `jobs`.
--
-- No SIRET column: Offres v2 never exposes one, neither in search nor on the
-- detail page, whatever the sprint hoped for.

ALTER TABLE "job_listings" ADD COLUMN IF NOT EXISTS "rome_code" text;
--> statement-breakpoint
ALTER TABLE "job_listings" ADD COLUMN IF NOT EXISTS "rome_appellation" text;
--> statement-breakpoint
ALTER TABLE "job_listings" ADD COLUMN IF NOT EXISTS "rome_competences" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "rome_code" text;
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "rome_competences" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_rome_code_idx" ON "jobs" ("rome_code");
