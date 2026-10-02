-- Career sites read several times an hour (ADR-027, US-164).
--
-- Every posting a company's board ever showed, by id only: an offer is "new"
-- when its id was never seen on that board. No content is kept here — the
-- offer itself goes to `job_listings` only if it matches a search (ADR-027 §4).
-- `announced_at` is what the recruiting software claims, `first_seen_at` is
-- when we saw it: Lever and Greenhouse do not always give a date one can trust.
CREATE TABLE IF NOT EXISTS "job_board_postings" (
	"provider" text NOT NULL,
	"board_token" text NOT NULL,
	"external_id" text NOT NULL,
	"announced_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_board_postings_pkey" PRIMARY KEY ("provider", "board_token", "external_id")
);
--> statement-breakpoint
-- From an advert back to its company's board, for "an offer of theirs matched".
CREATE INDEX IF NOT EXISTS "job_board_postings_external_idx" ON "job_board_postings" ("provider", "external_id");
--> statement-breakpoint
-- A board that answered 429 or 403 to the frequent pass is read once a day
-- until then.
ALTER TABLE "job_boards" ADD COLUMN IF NOT EXISTS "frequent_paused_until" timestamp with time zone;
--> statement-breakpoint
-- What the last pass of each stream did, for the admin: a frequent pass that
-- had to send companies back to the daily rhythm says so here (ADR-027 §3).
ALTER TABLE "job_stream_cursors" ADD COLUMN IF NOT EXISTS "last_report" jsonb;
