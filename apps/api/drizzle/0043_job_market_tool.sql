-- The free job market tool (US-137). A pair the radar never read is queued
-- here and read by the monthly refresh: the page never calls France Travail.
CREATE TABLE IF NOT EXISTS "market_demand" (
	"rome_code" text NOT NULL,
	"department" text NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "market_demand_rome_code_department_pk" PRIMARY KEY("rome_code","department")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "market_demand_requested_idx" ON "market_demand" USING btree ("requested_at");--> statement-breakpoint
-- The free tool that wrote a search, for the activation count of /admin/metrics.
ALTER TABLE "search_projects" ADD COLUMN IF NOT EXISTS "lead_origin" text;--> statement-breakpoint
ALTER TABLE "search_projects" ADD COLUMN IF NOT EXISTS "lead_origin_at" timestamp with time zone;
