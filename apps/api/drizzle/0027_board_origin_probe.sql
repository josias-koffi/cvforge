-- Where a company in the registry came from is shown on the admin screen, and
-- it has to be true. A board found by turning an employer's name into a
-- candidate address and checking it live is neither a "seed" (it is not
-- shipped with the code), nor a "crawl" (no Common Crawl index was read), nor
-- an "admin" entry (nobody typed it).
--
-- Hence a fifth origin, "probe". Replacing the check constraint is the whole
-- change: the column is free text with a constraint, not an enum type.

ALTER TABLE "job_boards" DROP CONSTRAINT IF EXISTS "job_boards_origin_valid";
--> statement-breakpoint
ALTER TABLE "job_boards" ADD CONSTRAINT "job_boards_origin_valid" CHECK ("origin" in ('seed', 'crawl', 'france_travail', 'user', 'admin', 'probe'));
