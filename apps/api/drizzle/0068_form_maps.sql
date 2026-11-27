-- The learned map of application forms (US-205): field shapes and data names
-- per site, never a value. New, small tables: plain indexes are fine.
CREATE TABLE IF NOT EXISTS "form_map_votes" (
  "site" text NOT NULL,
  "signature" text NOT NULL,
  "field_key" text NOT NULL,
  "user_email" text NOT NULL REFERENCES "auth_accounts"("email") ON DELETE CASCADE,
  "ok" boolean NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("site", "signature", "field_key", "user_email")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "form_map_votes_user_idx" ON "form_map_votes" ("user_email");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "form_fill_outcomes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "site" text NOT NULL,
  "ai_used" boolean NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "form_fill_outcomes_site_idx" ON "form_fill_outcomes" ("site");
