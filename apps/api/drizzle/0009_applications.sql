CREATE TABLE "application_cv_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"source" text NOT NULL,
	"template_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"content" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_letter_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"source" text NOT NULL,
	"template_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"content" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"status" text NOT NULL,
	"status_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_type" text NOT NULL,
	"source_label" text DEFAULT '' NOT NULL,
	"offer_url" text,
	"raw_offer_text" text DEFAULT '' NOT NULL,
	"offer_text_preview" text DEFAULT '' NOT NULL,
	"extracted" jsonb NOT NULL,
	"profile_id" text,
	"cv_content" jsonb,
	"cv_generated_at" timestamp with time zone,
	"cv_template_id" text,
	"letter_content" jsonb,
	"letter_generated_at" timestamp with time zone,
	"letter_template_id" text,
	"interview_reports" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_cv_versions" ADD CONSTRAINT "application_cv_versions_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_letter_versions" ADD CONSTRAINT "application_letter_versions_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_cv_versions_app_idx" ON "application_cv_versions" USING btree ("application_id","version_number");--> statement-breakpoint
CREATE INDEX "application_letter_versions_app_idx" ON "application_letter_versions" USING btree ("application_id","version_number");--> statement-breakpoint
CREATE INDEX "applications_user_created_idx" ON "applications" USING btree ("user_email","created_at" desc);--> statement-breakpoint
CREATE INDEX "applications_updated_idx" ON "applications" USING btree ("updated_at" desc);--> statement-breakpoint
CREATE INDEX "applications_cv_template_idx" ON "applications" USING btree ("cv_template_id");--> statement-breakpoint
CREATE INDEX "applications_letter_template_idx" ON "applications" USING btree ("letter_template_id");