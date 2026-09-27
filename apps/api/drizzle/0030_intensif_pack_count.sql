-- The landing titles each pack with floor(credits / 17) complete applications,
-- so Intensif's 870 credits read "51 candidatures" above a feature line that
-- promises 50. 850 is exactly 50 × 17: both lines now say the same thing.
--
-- The price is unchanged, so the existing `stripe_price_id` stays valid. The
-- Stripe product name embeds the credit count: re-sync it from the back-office.
UPDATE "credit_offers"
SET
  "credits" = 850,
  "updated_at" = now()
WHERE "slug" = 'intensif';
