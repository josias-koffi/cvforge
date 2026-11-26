-- Form fills paid in credits (US-202): the extension's model calls go through
-- JobSpark, capped per session. A new, small table: a plain index is fine.
CREATE TABLE IF NOT EXISTS "form_fill_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_email" text NOT NULL REFERENCES "auth_accounts"("email") ON DELETE CASCADE,
  "token_id" uuid NOT NULL REFERENCES "agent_tokens"("id") ON DELETE CASCADE,
  "application_id" text NOT NULL,
  "calls" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "form_fill_sessions_user_idx" ON "form_fill_sessions" ("user_email");
