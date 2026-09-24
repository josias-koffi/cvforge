-- The companies La Bonne Boîte expects to hire in a ROME job near a place
-- (US-119), read once a week and never on a page view. Public company data:
-- no user data, nothing to purge.
--
-- A query row per (job, place) records when it was read, so that "read,
-- nobody found" is told apart from "never read". Its companies are replaced
-- as a whole at each reading.

CREATE TABLE IF NOT EXISTS "hiring_company_queries" (
	"query_key" text PRIMARY KEY NOT NULL,
	"rome_code" text NOT NULL,
	"rome_label" text DEFAULT '' NOT NULL,
	"place" text NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL,
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hiring_companies" (
	"query_key" text NOT NULL,
	"siret" text NOT NULL,
	"name" text NOT NULL,
	"naf_code" text DEFAULT '' NOT NULL,
	"naf_label" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"postcode" text DEFAULT '' NOT NULL,
	"department" text DEFAULT '' NOT NULL,
	"latitude" real,
	"longitude" real,
	"headcount_min" integer,
	"headcount_max" integer,
	"hiring_potential" real DEFAULT 0 NOT NULL,
	"high_potential" boolean DEFAULT false NOT NULL,
	"reachable_by_email" boolean DEFAULT false NOT NULL,
	CONSTRAINT "hiring_companies_pkey" PRIMARY KEY ("query_key", "siret")
);
