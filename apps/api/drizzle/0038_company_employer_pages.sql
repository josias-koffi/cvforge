-- The France Travail employer page of each company (US-116), read with its
-- monthly record from Pages employeurs. Public data; `employer_page_read_at`
-- stays null until the API was asked, so that enabling it later reads every
-- company once, without waiting for the month to end.

ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "employer_page_path" text;
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "employer_page_offers" integer;
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "employer_page_edited" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "employer_page_read_at" timestamp with time zone;
