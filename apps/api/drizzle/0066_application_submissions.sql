-- Proof of the applications the Chrome extension sent (ADR-034 §7, US-198):
-- filled fields, documents, confirmation page and a screenshot of it. A new,
-- small table: a plain index is fine.
CREATE TABLE IF NOT EXISTS "application_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "application_id" text NOT NULL REFERENCES "applications"("id") ON DELETE CASCADE,
  "user_email" text NOT NULL REFERENCES "auth_accounts"("email") ON DELETE CASCADE,
  "submitted_at" timestamp with time zone NOT NULL,
  "form_url" text NOT NULL,
  "confirmation_url" text,
  "confirmed" boolean NOT NULL,
  "documents" jsonb NOT NULL,
  "fields" jsonb NOT NULL,
  "screenshot" bytea,
  "screenshot_type" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_submissions_application_idx" ON "application_submissions" ("application_id");
