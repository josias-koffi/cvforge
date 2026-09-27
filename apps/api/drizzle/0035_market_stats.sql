-- The labour market of one ROME job in one department (US-128), read once a
-- month from France Travail's Marché du travail API and never on a page view.
-- A cache of public figures: no user data, nothing to purge. Each figure keeps
-- the period France Travail measured it on, because none is shown without it.
--
-- `change_note` is written when a refresh moves a figure notably (a tension
-- level, a third of the offers); the morning e-mail repeats it once.

CREATE TABLE IF NOT EXISTS "market_stats" (
	"rome_code" text NOT NULL,
	"department" text NOT NULL,
	"rome_label" text DEFAULT '' NOT NULL,
	"region" text DEFAULT '' NOT NULL,
	"tension_level" integer,
	"tension_period" text,
	"offers_count" integer,
	"offers_year_count" integer,
	"offers_period" text,
	"jobseekers_count" integer,
	"jobseekers_period" text,
	"salary_median_yearly" integer,
	"salary_sample" integer,
	"salary_period" text,
	"change_note" text,
	"changed_at" timestamp with time zone,
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "market_stats_pkey" PRIMARY KEY ("rome_code", "department")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "market_stats_rome_region_idx" ON "market_stats" ("rome_code", "region");
