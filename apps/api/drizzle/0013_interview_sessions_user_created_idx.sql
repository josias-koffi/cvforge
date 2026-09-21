-- The session history reads by user, newest first. A composite index with
-- user_email leading serves that ordering and also covers every lookup the
-- single-column index served (findByIdForUserEmail, deleteByUserEmail), so
-- the old one is dropped rather than kept: `save()` writes on every
-- transcribed chunk, and two indexes would mean paying for both on the
-- hottest path of the feature.
CREATE INDEX "interview_sessions_user_created_idx" ON "interview_sessions" USING btree ("user_email","created_at" DESC);--> statement-breakpoint
DROP INDEX IF EXISTS "interview_sessions_user_idx";
