-- An interview now costs 1.5 credits a minute instead of 1: 15 credits for ten
-- minutes, so a complete application is 22 credits instead of 17 (1 offer
-- analysis + 3 CV + 3 letter + 15 for a ten-minute interview). The live
-- Realtime voice costs about €0.24 for ten minutes, which left the Intensif
-- pack with about a quarter of margin on an interview.
--
-- Prices and credit counts do not move, so every `stripe_price_id` stays
-- valid; only the advertised count follows floor(credits / 22), the figure the
-- landing already titles each pack with.
UPDATE "credit_offers"
SET
  "features" = '{"fr": ["4 candidatures complètes (analyse, CV, lettre, entretien simulé et rapport)", "Crédits sans date d''expiration", "Paiement unique, sans abonnement"], "en": ["4 complete applications (analysis, CV, letter, mock interview and report)", "Credits never expire", "One-time payment, no subscription"]}',
  "updated_at" = now()
WHERE "slug" = 'essentiel';
--> statement-breakpoint
UPDATE "credit_offers"
SET
  "features" = '{"fr": ["15 candidatures complètes (analyse, CV, lettre, entretien simulé et rapport)", "Crédits sans date d''expiration", "Paiement unique, sans abonnement"], "en": ["15 complete applications (analysis, CV, letter, mock interview and report)", "Credits never expire", "One-time payment, no subscription"]}',
  "updated_at" = now()
WHERE "slug" = 'recherche-active';
--> statement-breakpoint
UPDATE "credit_offers"
SET
  "features" = '{"fr": ["38 candidatures complètes (analyse, CV, lettre, entretien simulé et rapport)", "Crédits sans date d''expiration", "Paiement unique, sans abonnement"], "en": ["38 complete applications (analysis, CV, letter, mock interview and report)", "Credits never expire", "One-time payment, no subscription"]}',
  "updated_at" = now()
WHERE "slug" = 'intensif';
