CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"title_key" text NOT NULL,
	"company_name" text DEFAULT '' NOT NULL,
	"company_key" text DEFAULT '' NOT NULL,
	"company_anonymous" boolean DEFAULT false NOT NULL,
	"department" text DEFAULT '' NOT NULL,
	"location_label" text DEFAULT '' NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"remote" boolean DEFAULT false NOT NULL,
	"contract_type" text DEFAULT 'unknown' NOT NULL,
	"salary_label" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"description_simhash" text DEFAULT '' NOT NULL,
	"primary_url" text DEFAULT '' NOT NULL,
	"published_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "job_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"source" text NOT NULL,
	"external_id" text NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"apply_url" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"company_name" text DEFAULT '' NOT NULL,
	"company_anonymous" boolean DEFAULT false NOT NULL,
	"location_label" text DEFAULT '' NOT NULL,
	"department" text DEFAULT '' NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"remote" boolean DEFAULT false NOT NULL,
	"contract_type" text DEFAULT 'unknown' NOT NULL,
	"salary_label" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"published_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"match_method" text DEFAULT 'new' NOT NULL,
	"raw" jsonb,
	CONSTRAINT "job_listings_match_method_valid" CHECK ("job_listings"."match_method" in ('new', 'url', 'strict_key', 'fuzzy', 'manual'))
);
--> statement-breakpoint
CREATE TABLE "job_links" (
	"url_key" text PRIMARY KEY NOT NULL,
	"job_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_listings" ADD CONSTRAINT "job_listings_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_links" ADD CONSTRAINT "job_links_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jobs_company_department_idx" ON "jobs" USING btree ("company_key","department");--> statement-breakpoint
CREATE INDEX "jobs_open_idx" ON "jobs" USING btree ("closed_at","first_seen_at");--> statement-breakpoint
CREATE INDEX "jobs_title_key_idx" ON "jobs" USING btree ("title_key");--> statement-breakpoint
CREATE UNIQUE INDEX "job_listings_source_external_idx" ON "job_listings" USING btree ("source","external_id");--> statement-breakpoint
CREATE INDEX "job_listings_job_idx" ON "job_listings" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "job_links_job_idx" ON "job_links" USING btree ("job_id");
