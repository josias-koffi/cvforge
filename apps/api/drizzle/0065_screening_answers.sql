-- The candidate's answers to recruiters' screening questions (ADR-034 §5),
-- read by the Chrome extension when it fills a form. One small row per account.
CREATE TABLE IF NOT EXISTS "screening_answers" (
  "user_email" text PRIMARY KEY NOT NULL REFERENCES "auth_accounts"("email") ON DELETE CASCADE,
  "known" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "custom" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
