CREATE TABLE "job_boards" (
	"provider" text NOT NULL,
	"board_token" text NOT NULL,
	"company_name" text DEFAULT '' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"origin" text NOT NULL,
	"last_fetched_at" timestamp with time zone,
	"last_status" text,
	"last_job_count" integer DEFAULT 0 NOT NULL,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_boards_origin_valid" CHECK ("job_boards"."origin" in ('seed', 'crawl', 'france_travail', 'user', 'admin'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "job_boards_provider_token_idx" ON "job_boards" USING btree ("provider","board_token");--> statement-breakpoint
CREATE INDEX "job_boards_enabled_idx" ON "job_boards" USING btree ("enabled","last_fetched_at");
