-- Continuous collection (ADR-027, US-163).
--
-- One row per streamed source: where the last slice read successfully ended,
-- and who holds the lease. The lease is the lock, enforced by the database
-- like `job_digest_runs`: the API can run several instances, and only the one
-- whose UPDATE matched may read the stream. A lease left by a dead process
-- simply expires.
CREATE TABLE IF NOT EXISTS "job_stream_cursors" (
	"source" text PRIMARY KEY NOT NULL,
	"cursor_at" timestamp with time zone,
	"locked_by" text,
	"locked_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Calls made to each source, per day (Paris). The quota of France Travail
-- depends on the application's status; this is how we see how far from it we are.
CREATE TABLE IF NOT EXISTS "job_source_calls" (
	"source" text NOT NULL,
	"day" date NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "job_source_calls_pkey" PRIMARY KEY ("source", "day")
);
