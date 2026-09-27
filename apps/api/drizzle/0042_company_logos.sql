-- Company logos (ADR-025): France Travail's on the offers, Wikidata's on the
-- companies. Only the source URL is kept here; the images live in Redis.
ALTER TABLE "jobs" ADD COLUMN "company_logo_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "logo_url" text;--> statement-breakpoint
-- Null means "Wikidata never asked": every company already read is due again,
-- for its logo, with the next pass.
ALTER TABLE "companies" ADD COLUMN "logo_read_at" timestamp with time zone;--> statement-breakpoint
-- The offers collected before this migration already carry their logo, in the
-- France Travail answer kept as `raw`: no need to wait for a new collection.
UPDATE "jobs" AS j
SET "company_logo_url" = l."logo"
FROM (
  SELECT DISTINCT ON ("job_id") "job_id", "raw"->'entreprise'->>'logo' AS "logo"
  FROM "job_listings"
  WHERE "source" = 'france_travail'
    AND "raw"->'entreprise'->>'logo' LIKE 'https://api.francetravail.fr/%'
  ORDER BY "job_id", "last_seen_at" DESC
) AS l
WHERE l."job_id" = j."id" AND NOT j."company_anonymous";
