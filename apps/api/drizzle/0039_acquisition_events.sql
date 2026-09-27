-- The funnel of the landing's free tools (US-131): one row per visitor, per
-- day, per step of a tool.
--
-- Nothing here identifies anyone. `ip_hash` = sha256(day + ip + secret) changes
-- every day, so a visitor cannot be followed from one day to the next. There is
-- no email and no free text. Rows are purged after 90 days.
CREATE TABLE IF NOT EXISTS "acquisition_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "day" date NOT NULL,
  "tool" text NOT NULL,
  "step" text NOT NULL,
  "locale" text NOT NULL,
  "ip_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "acquisition_events_step_valid" CHECK ("step" in ('view', 'result', 'cta_click', 'email_submitted'))
);
--> statement-breakpoint
-- One row per visitor, step and day: a reload writes nothing, and a single
-- address can write at most tools × steps rows a day.
CREATE UNIQUE INDEX IF NOT EXISTS "acquisition_events_visitor_idx" ON "acquisition_events" ("day", "tool", "step", "ip_hash");
--> statement-breakpoint
-- Drives both the dashboard window and the retention purge.
CREATE INDEX IF NOT EXISTS "acquisition_events_day_idx" ON "acquisition_events" ("day");
