-- What the offer asked that the candidate's CV did not show, carried from
-- "Postuler avec CVForge" to the CV generation (US-127). Pointers for the
-- model to bring forward if the profile already holds them — never facts.

ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "skills_to_highlight" jsonb DEFAULT '[]'::jsonb NOT NULL;
