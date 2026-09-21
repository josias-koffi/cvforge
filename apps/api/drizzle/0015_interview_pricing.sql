-- A complete application now includes its mock interview and scored report, so
-- it costs 17 credits instead of 7 (1 offer analysis + 3 CV + 3 letter + 10 for
-- a ten-minute interview). The advertised counts and the prices do not move;
-- the packs grow to keep those counts honest.
--
-- Updated in place rather than archived and re-inserted: these offers are live
-- and already carry their Stripe price. The price is unchanged, so the existing
-- `stripe_price_id` stays valid and checkout never goes 503. A Stripe re-sync
-- from the back-office is still worth doing — the product name embeds the
-- credit count — but nothing breaks without it.
UPDATE "credit_offers"
SET
  "credits" = 90,
  "features" = '{"fr": ["5 candidatures complètes (analyse, CV, lettre, entretien simulé et rapport)", "Crédits sans date d''expiration", "Paiement unique, sans abonnement", "TVA incluse"], "en": ["5 complete applications (analysis, CV, letter, mock interview and report)", "Credits never expire", "One-time payment, no subscription", "VAT included"]}',
  "updated_at" = now()
WHERE "slug" = 'essentiel';
--> statement-breakpoint
UPDATE "credit_offers"
SET
  "credits" = 350,
  "features" = '{"fr": ["20 candidatures complètes (analyse, CV, lettre, entretien simulé et rapport)", "Crédits sans date d''expiration", "Paiement unique, sans abonnement", "TVA incluse"], "en": ["20 complete applications (analysis, CV, letter, mock interview and report)", "Credits never expire", "One-time payment, no subscription", "VAT included"]}',
  "updated_at" = now()
WHERE "slug" = 'recherche-active';
--> statement-breakpoint
UPDATE "credit_offers"
SET
  "credits" = 870,
  "features" = '{"fr": ["50 candidatures complètes (analyse, CV, lettre, entretien simulé et rapport)", "Crédits sans date d''expiration", "Paiement unique, sans abonnement", "TVA incluse"], "en": ["50 complete applications (analysis, CV, letter, mock interview and report)", "Credits never expire", "One-time payment, no subscription", "VAT included"]}',
  "updated_at" = now()
WHERE "slug" = 'intensif';
