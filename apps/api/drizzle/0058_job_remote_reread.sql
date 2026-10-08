-- "Remote" now means fully remote (2026-10-08). France Travail offers were
-- read as remote on any mention of "télétravail", hybrid ones and
-- "télétravail : non" included, and La bonne alternance's hybrid offers too.
-- Same patterns as `france-travail.mapper.ts`; Postgres spells \b as \m.
UPDATE "job_listings"
SET "remote" = (
  lower("title" || ' ' || "location_label" || ' ' || "description") ~ '\m(100 ?%|full|totalement|enti[eè]rement|complet)[^.\n]{0,20}(t[eé]l[eé]travail|remote|[aà] distance)'
  OR lower("title" || ' ' || "location_label" || ' ' || "description") ~ '\m(t[eé]l[eé]travail|remote)[^.\n]{0,15}(100 ?%|total|complet|int[eé]gral)'
)
WHERE "source" = 'france_travail';
--> statement-breakpoint
UPDATE "job_listings"
SET "remote" = false
WHERE "source" = 'la_bonne_alternance' AND "raw" -> 'contract' ->> 'remote' = 'hybrid';
--> statement-breakpoint
-- A job is remote when one of its adverts says so, as `attachListing` decides.
UPDATE "jobs"
SET "remote" = "listed"."remote"
FROM (
  SELECT "job_id", bool_or("remote") AS "remote"
  FROM "job_listings"
  GROUP BY "job_id"
) AS "listed"
WHERE "listed"."job_id" = "jobs"."id" AND "jobs"."remote" <> "listed"."remote";
