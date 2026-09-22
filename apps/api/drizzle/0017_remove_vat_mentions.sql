-- The publisher is not liable for VAT (franchise en base, article 293 B du
-- code général des impôts), so nothing in the product may announce a VAT rate
-- or a VAT number. The seeds in 0003, 0012, 0015 and 0016 are corrected at
-- their source for fresh environments; this migration carries the same
-- correction to environments already running.
--
-- Every statement is scoped to the text it removes, so on a fresh database —
-- where the corrected seeds have just run — it matches nothing and the legal
-- documents keep the version their seed gave them.
UPDATE "credit_offers"
SET
  "features" = jsonb_build_object(
    'fr',
    COALESCE(
      (
        SELECT jsonb_agg(feature)
        FROM jsonb_array_elements("features" -> 'fr') AS feature
        WHERE feature <> '"TVA incluse"'::jsonb
      ),
      '[]'::jsonb
    ),
    'en',
    COALESCE(
      (
        SELECT jsonb_agg(feature)
        FROM jsonb_array_elements("features" -> 'en') AS feature
        WHERE feature <> '"VAT included"'::jsonb
      ),
      '[]'::jsonb
    )
  ),
  "updated_at" = now()
WHERE "features"::text LIKE '%TVA incluse%'
   OR "features"::text LIKE '%VAT included%';
--> statement-breakpoint
-- A legal text that changes is a new version: which wording was in force when
-- has to stay establishable, exactly as a publication from the back-office
-- would leave it.
UPDATE "legal_documents"
SET
  "body" = jsonb_build_object(
    'fr',
    replace(
      "body" ->> 'fr',
      'Les prix sont affichés en euros, toutes taxes comprises, TVA française de 20 % incluse.',
      'Les prix sont affichés en euros. TVA non applicable, article 293 B du code général des impôts.'
    ),
    'en',
    replace(
      "body" ->> 'en',
      'Prices are shown in euros, all taxes included, with French VAT at 20% included.',
      'Prices are shown in euros. VAT is not applicable, under Article 293 B of the French General Tax Code.'
    )
  ),
  "version" = "version" + 1,
  "published_at" = now(),
  "updated_at" = now()
WHERE "slug" = 'sales-terms'
  AND "body"::text LIKE '%TVA française de 20 %';
--> statement-breakpoint
UPDATE "legal_documents"
SET
  "body" = jsonb_build_object(
    'fr',
    replace("body" ->> 'fr', E'- Numéro de TVA intracommunautaire : [NUMÉRO DE TVA]\n', ''),
    'en',
    replace("body" ->> 'en', E'- VAT number: [VAT NUMBER]\n', '')
  ),
  "version" = "version" + 1,
  "published_at" = now(),
  "updated_at" = now()
WHERE "slug" = 'legal-notice'
  AND "body"::text LIKE '%TVA intracommunautaire%';
