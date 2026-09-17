CREATE TABLE "templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"locale" text DEFAULT 'fr' NOT NULL,
	"categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"layout" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "templates_kind_valid" CHECK ("templates"."kind" in ('cv', 'letter')),
	CONSTRAINT "templates_locale_valid" CHECK ("templates"."locale" in ('fr', 'en'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "templates_single_default_per_kind_idx" ON "templates" USING btree ("kind") WHERE "templates"."is_default";