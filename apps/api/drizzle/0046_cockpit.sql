-- The admin cockpit (E26). What each AI call cost (US-154), and what visitors
-- look up in the free tools (US-155). Neither table holds anyone's identity.
CREATE TABLE IF NOT EXISTS "ai_usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature" text NOT NULL,
	"model" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(12, 6) DEFAULT 0 NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"fell_back" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_usage_events_status_valid" CHECK ("ai_usage_events"."status" in ('ok', 'error'))
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_usage_events_created_at_idx" ON "ai_usage_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_usage_events_feature_idx" ON "ai_usage_events" USING btree ("feature","created_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tool_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day" date NOT NULL,
	"tool" text NOT NULL,
	"query_key" text NOT NULL,
	"label" text NOT NULL,
	"place" text DEFAULT '' NOT NULL,
	"hits" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "tool_queries_tool_valid" CHECK ("tool_queries"."tool" in ('company_check', 'job_market'))
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tool_queries_day_key_idx" ON "tool_queries" USING btree ("day","tool","query_key","place");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tool_queries_day_idx" ON "tool_queries" USING btree ("day");
