-- Seed the two historical packs so the catalogue is never empty after the
-- first deploy. Stripe objects are created from the back-office
-- ("Synchroniser Stripe"), with the environment's own Stripe account.
INSERT INTO "credit_offers" ("slug", "status", "name", "description", "features", "credits", "price_cents", "is_featured", "sort_order")
VALUES
  (
    'starter',
    'active',
    '{"fr": "Starter", "en": "Starter"}',
    '{"fr": "Pour lancer vos premières candidatures.", "en": "To get your first applications going."}',
    '{"fr": ["Crédits sans date d''expiration", "Paiement unique et sécurisé via Stripe", "Toutes les fonctionnalités incluses"], "en": ["Credits never expire", "One-time secure payment via Stripe", "Every feature included"]}',
    550,
    999,
    false,
    10
  ),
  (
    'pro',
    'active',
    '{"fr": "Pro", "en": "Pro"}',
    '{"fr": "Pour une recherche d''emploi active.", "en": "For an active job search."}',
    '{"fr": ["Crédits sans date d''expiration", "Paiement unique et sécurisé via Stripe", "Toutes les fonctionnalités incluses"], "en": ["Credits never expire", "One-time secure payment via Stripe", "Every feature included"]}',
    1400,
    1999,
    true,
    20
  )
ON CONFLICT ("slug") DO NOTHING;
