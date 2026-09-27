-- What an offer asks that the candidate's CV does not show (US-126): the
-- offer's own ROME competences, required ones first. Next to `matched_skills`,
-- they make "Vous avez / À mettre en avant" on the card (US-127).

ALTER TABLE "job_matches" ADD COLUMN IF NOT EXISTS "missing_skills" jsonb DEFAULT '[]'::jsonb NOT NULL;
