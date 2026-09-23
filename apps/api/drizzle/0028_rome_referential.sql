-- A local copy of ROME 4.0, France Travail's referential of jobs and skills
-- (ADR-024, US-123). Every later feature speaks ROME — collection, scoring,
-- La Bonne Boîte, the labour market — and none of them may call the API on a
-- page view. `rome:sync` replaces these tables as a whole, in one transaction,
-- once a week: a failed sync leaves the previous copy in place.
--
-- Measured on 2026-09-23 (version 61): 1 911 métiers, 14 301 appellations,
-- 35 595 compétences and 106 792 métier–compétence links, in three calls.

CREATE TABLE IF NOT EXISTS "rome_metiers" (
	"code" text PRIMARY KEY NOT NULL,
	"libelle" text NOT NULL,
	"domaine_code" text NOT NULL,
	"domaine_libelle" text NOT NULL,
	"grand_domaine_code" text NOT NULL,
	"grand_domaine_libelle" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rome_appellations" (
	"code" text PRIMARY KEY NOT NULL,
	"libelle" text NOT NULL,
	"libelle_court" text NOT NULL,
	"libelle_search" text NOT NULL,
	"metier_code" text NOT NULL REFERENCES "rome_metiers"("code")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rome_appellations_metier_idx" ON "rome_appellations" ("metier_code");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rome_competences" (
	"code" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"libelle" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rome_competences_type_idx" ON "rome_competences" ("type");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rome_metier_competences" (
	"metier_code" text NOT NULL REFERENCES "rome_metiers"("code"),
	"competence_code" text NOT NULL REFERENCES "rome_competences"("code"),
	CONSTRAINT "rome_metier_competences_pkey" PRIMARY KEY ("metier_code", "competence_code")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rome_metier_competences_competence_idx" ON "rome_metier_competences" ("competence_code");
--> statement-breakpoint
-- A retired code and its replacement. Tables that store ROME codes for users
-- (projects, profiles) have no foreign key to the referential, by design: a
-- code France Travail retires must be rewritten, not cascade-deleted.
CREATE TABLE IF NOT EXISTS "rome_substitutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity" text NOT NULL,
	"old_code" text NOT NULL,
	"new_code" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_at" timestamp with time zone,
	"applied_stats" jsonb,
	CONSTRAINT "rome_substitutions_entity_check" CHECK ("entity" in ('metier', 'appellation', 'competence'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rome_substitutions_unique_idx" ON "rome_substitutions" ("entity", "old_code", "new_code");
--> statement-breakpoint
-- The running row is the lock: one sync at a time, whatever the number of
-- API instances, exactly like `job_digest_runs`.
CREATE TABLE IF NOT EXISTS "rome_sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"stats" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rome_sync_runs_running_idx" ON "rome_sync_runs" ("status") WHERE "status" = 'running';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rome_sync_runs_recent_idx" ON "rome_sync_runs" ("started_at" DESC);
