-- The ROME appellations of a search project (US-118, ADR-024). ROMEO suggests
-- them when the project is saved; the candidate confirms or dismisses each
-- one. A dismissed one stays here so it is never suggested again.
--
-- No foreign key, like `search_projects`: `PgProfilesStore.save` deletes and
-- re-inserts every profile row, and a code France Travail retires must be
-- rewritten by the substitutions (`rome_substitutions`), not cascade-deleted.
-- The labels are a snapshot for when the referential no longer knows the code.

CREATE TABLE IF NOT EXISTS "search_project_rome" (
	"user_email" text NOT NULL,
	"profile_id" text NOT NULL,
	"appellation_code" text NOT NULL,
	"libelle" text NOT NULL,
	"metier_code" text NOT NULL,
	"metier_libelle" text NOT NULL,
	"status" text NOT NULL,
	"score" real,
	"source" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "search_project_rome_pkey" PRIMARY KEY ("user_email", "profile_id", "appellation_code"),
	CONSTRAINT "search_project_rome_status_check" CHECK ("status" in ('suggested', 'confirmed', 'dismissed')),
	CONSTRAINT "search_project_rome_source_check" CHECK ("source" in ('romeo', 'manual'))
);
