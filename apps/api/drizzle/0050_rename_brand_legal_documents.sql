-- Jobspark rename: fixes the brand name inside the stored legal document
-- bodies/titles seeded by 0016_legal_documents.sql (left untouched — a past
-- migration is never edited after merge).
--
-- Scoped to rows that still mention "CVSpark", so it never overwrites text an
-- admin has since rewritten from /admin/legal that no longer mentions it, and
-- is safe to re-run (a second run touches zero rows).
UPDATE "legal_documents"
SET
  "title" = jsonb_build_object(
    'fr', regexp_replace(title ->> 'fr', 'CVSpark', 'Jobspark', 'g'),
    'en', regexp_replace(title ->> 'en', 'CVSpark', 'Jobspark', 'g')
  ),
  "body" = jsonb_build_object(
    'fr', regexp_replace(body ->> 'fr', 'CVSpark', 'Jobspark', 'g'),
    'en', regexp_replace(body ->> 'en', 'CVSpark', 'Jobspark', 'g')
  ),
  "updated_at" = now()
WHERE
  (title ->> 'fr') ILIKE '%CVSpark%'
  OR (title ->> 'en') ILIKE '%CVSpark%'
  OR (body ->> 'fr') ILIKE '%CVSpark%'
  OR (body ->> 'en') ILIKE '%CVSpark%';
