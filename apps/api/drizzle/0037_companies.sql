-- The company behind each hiring establishment (US-121), keyed by SIREN and
-- read monthly from the Annuaire des entreprises and Egapro, never on a page
-- view. Public company data: no user data, nothing to purge, and the
-- officers the Annuaire lists are not copied.

CREATE TABLE IF NOT EXISTS "companies" (
	"siren" text PRIMARY KEY NOT NULL,
	"found" boolean DEFAULT true NOT NULL,
	"legal_name" text DEFAULT '' NOT NULL,
	"naf_code" text DEFAULT '' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"headcount_band" text DEFAULT '' NOT NULL,
	"created_on" text,
	"open_establishments" integer,
	"finances_year" text,
	"revenue" bigint,
	"net_income" bigint,
	"closed" boolean DEFAULT false NOT NULL,
	"mission" boolean DEFAULT false NOT NULL,
	"ess" boolean DEFAULT false NOT NULL,
	"inclusive" boolean DEFAULT false NOT NULL,
	"ges_report" boolean DEFAULT false NOT NULL,
	"egapro_score" integer,
	"egapro_year" text,
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL
);
