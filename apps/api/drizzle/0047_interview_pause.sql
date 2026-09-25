-- A live interview can be paused (ADR-026): the call is hung up and the clock
-- stops. Set while paused, cleared on resume, when the start is moved forward
-- by the length of the pause. Null means the interview is not paused.
ALTER TABLE "interview_sessions" ADD COLUMN IF NOT EXISTS "paused_at" timestamp with time zone;
