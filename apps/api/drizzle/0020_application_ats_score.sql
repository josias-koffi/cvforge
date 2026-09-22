-- The ATS score of a generated CV, free and recomputed on every save.
--
-- Two homes, on purpose:
--
--   * `applications.ats_score` is the score as the CV currently stands, kept
--     whole as jsonb. It is read for every row of the candidatures list
--     (vision §7.1) and never queried field by field — the same reasoning the
--     table already applies to `cv_content`.
--
--   * `application_cv_versions.ats_score` is just the number, per version, so
--     the progression chart (vision §12.3) reads a column instead of
--     re-scoring every historical document.
--
-- `ats_engine_version` travels with the per-version number because the scale
-- is versioned (ADR-021): scores computed under 1.0.0 and 1.1.0 are not
-- comparable, and an average across both would be meaningless. Aggregations
-- must group by it.
--
-- All three are nullable: every CV generated before this migration has no
-- score, and a missing score must read as "not measured", never as zero.
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "ats_score" jsonb;
--> statement-breakpoint
ALTER TABLE "application_cv_versions" ADD COLUMN IF NOT EXISTS "ats_score" integer;
--> statement-breakpoint
ALTER TABLE "application_cv_versions" ADD COLUMN IF NOT EXISTS "ats_engine_version" text;
--> statement-breakpoint
ALTER TABLE "application_cv_versions" ADD CONSTRAINT "application_cv_versions_ats_score_range"
  CHECK ("ats_score" IS NULL OR "ats_score" BETWEEN 0 AND 100);
