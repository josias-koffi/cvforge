CREATE TABLE "job_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_email" text NOT NULL,
	"profile_id" text NOT NULL,
	"job_id" uuid NOT NULL,
	"digest_date" date NOT NULL,
	"score" integer NOT NULL,
	"score_breakdown" jsonb,
	"matched_skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_rank" integer,
	"ai_reason" text,
	"status" text DEFAULT 'new' NOT NULL,
	"application_id" text,
	"job_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_matches_status_valid" CHECK ("job_matches"."status" in ('new', 'seen', 'saved', 'dismissed', 'applied')),
	CONSTRAINT "job_matches_score_range" CHECK ("job_matches"."score" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "job_digest_runs" (
	"run_date" date PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"stats" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "job_matches_user_job_idx" ON "job_matches" USING btree ("user_email","job_id");--> statement-breakpoint
CREATE INDEX "job_matches_user_digest_idx" ON "job_matches" USING btree ("user_email","digest_date");
