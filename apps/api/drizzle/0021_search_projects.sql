CREATE TABLE "search_projects" (
	"user_email" text NOT NULL,
	"profile_id" text NOT NULL,
	"target_roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"experience_level" text,
	"contract_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"part_time_ok" boolean DEFAULT false NOT NULL,
	"internship" jsonb,
	"apprenticeship" jsonb,
	"sectors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"excluded_sectors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"locations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"remote" text DEFAULT 'any' NOT NULL,
	"national_mobility" boolean DEFAULT false NOT NULL,
	"salary_min_yearly" integer,
	"company_sizes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"company_values" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"excluded_companies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"digest_enabled" boolean DEFAULT false NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"ai_rerank_enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "search_projects_user_profile_idx" ON "search_projects" USING btree ("user_email","profile_id");--> statement-breakpoint
CREATE INDEX "search_projects_digest_idx" ON "search_projects" USING btree ("digest_enabled");
