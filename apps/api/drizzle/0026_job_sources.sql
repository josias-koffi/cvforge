-- Cutting a source off used to mean a redeploy: availability came from the
-- environment and nothing else. Two different questions were conflated.
--
-- The environment still decides **availability** — a source without
-- credentials stays inert whatever this table says. This table decides
-- **activation**: switching off a source that is otherwise configured, when it
-- misbehaves or costs too much, without touching the deployment.
--
-- Shaped like `job_boards`, whose vocabulary already fits: the last outcome of
-- each source, and a failure counter. A row per ATS provider lives here too,
-- so a whole provider can be silenced without touching each company.
--
-- Deliberately **not** pre-filled with the known sources: the code already
-- holds that list (`jobSources`), and writing it here too would mean keeping
-- two lists in step. A source with no row is enabled and has never run.

CREATE TABLE IF NOT EXISTS "job_sources" (
	"source" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_status" text,
	"last_listing_count" integer DEFAULT 0 NOT NULL,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
