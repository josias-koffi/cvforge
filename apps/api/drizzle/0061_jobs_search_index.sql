-- The candidate's own search (/offres) read the whole jobs table on every
-- request: `like '%word%'` on the folded advert, then the same scan again for
-- the count — 13 s at 500,000 offers (2026-11-12). These indexes cover open
-- offers only, the only ones the search shows.
--
-- The expressions are `JOBS_SEARCH_VECTOR_SQL` and `JOBS_AGE_SQL` in
-- `src/database/schema/jobs.ts`, to the character: the planner only uses an
-- expression index for the very same expression.
--
-- Building them blocks writes to "jobs" for a minute or two: deploy outside
-- the morning collection. More sort memory than the 64 MB default, for this
-- transaction only: the GIN build over the adverts goes several times faster.
SET LOCAL maintenance_work_mem = '512MB';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_search_idx" ON "jobs" USING gin ((
  setweight(to_tsvector('simple'::regconfig, translate(lower("jobs"."title"), 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿœæ', 'aaaaaaceeeeiiiinooooouuuuyyoa')), 'A')
  || setweight(to_tsvector('simple'::regconfig, translate(lower("jobs"."company_name"), 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿœæ', 'aaaaaaceeeeiiiinooooouuuuyyoa')), 'B')
  || setweight(to_tsvector('simple'::regconfig, translate(lower("jobs"."description"), 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿœæ', 'aaaaaaceeeeiiiinooooouuuuyyoa')), 'C')
)) WHERE "closed_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_open_age_idx" ON "jobs" ((
  least(coalesce("jobs"."published_at", "jobs"."first_seen_at"), "jobs"."first_seen_at")
)) WHERE "closed_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_open_department_idx" ON "jobs" ("department") WHERE "closed_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_open_contract_idx" ON "jobs" ("contract_type") WHERE "closed_at" IS NULL;
--> statement-breakpoint
-- Around a city (`?ville=`): the bounding box of the circle, before the exact
-- distance.
CREATE INDEX IF NOT EXISTS "jobs_open_coordinates_idx" ON "jobs" ("latitude", "longitude") WHERE "closed_at" IS NULL AND "latitude" IS NOT NULL;
--> statement-breakpoint
ANALYZE "jobs";
