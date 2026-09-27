-- The ROME competences read in a candidate's CV (US-125, ADR-024). ROMEO infers
-- them when the profile is saved; the candidate removes the wrong ones, and a
-- removed one stays here as `dismissed` so it is never inferred again.
--
-- No foreign key, like `search_project_rome`: `PgProfilesStore.save` deletes
-- and re-inserts every profile row, and a code France Travail retires is
-- rewritten by the substitutions, not cascade-deleted. The label is a snapshot
-- for when the referential no longer knows the code.

CREATE TABLE IF NOT EXISTS "profile_rome_competences" (
	"user_email" text NOT NULL,
	"profile_id" text NOT NULL,
	"competence_code" text NOT NULL,
	"libelle" text NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"score" real NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_rome_competences_pkey" PRIMARY KEY ("user_email", "profile_id", "competence_code"),
	CONSTRAINT "profile_rome_competences_status_check" CHECK ("status" in ('inferred', 'dismissed'))
);
--> statement-breakpoint
-- The fingerprint of the texts ROMEO last read for a profile: an unchanged CV
-- is never sent again. Kept apart because a CV may yield no competence at all.
CREATE TABLE IF NOT EXISTS "profile_rome_inferences" (
	"user_email" text NOT NULL,
	"profile_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"inferred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_rome_inferences_pkey" PRIMARY KEY ("user_email", "profile_id")
);
