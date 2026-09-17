CREATE TABLE "profile_registries" (
	"user_email" text PRIMARY KEY NOT NULL,
	"active_profile_id" text NOT NULL,
	"version" integer DEFAULT 2 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"position" integer NOT NULL,
	"label" text DEFAULT 'Profil' NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"identity" jsonb NOT NULL,
	"preferences" jsonb NOT NULL,
	"sections" jsonb NOT NULL,
	"meta" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_email_profile_registries_user_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."profile_registries"("user_email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_position_idx" ON "profiles" USING btree ("user_email","position");