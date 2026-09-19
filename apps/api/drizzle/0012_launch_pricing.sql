-- Launch pricing, sized in complete applications (7 credits each) rather than
-- raw credits. The historical packs are archived, never deleted: past orders
-- reference them. Archiving first also frees the single "featured" slot.
-- New offers get their Stripe objects from the back-office ("Synchroniser
-- Stripe"), with the environment's own Stripe account.
UPDATE "credit_offers"
SET "status" = 'archived', "is_featured" = false, "updated_at" = now()
WHERE "slug" IN ('starter', 'pro');
--> statement-breakpoint
INSERT INTO "credit_offers" ("slug", "status", "name", "description", "features", "credits", "price_cents", "is_featured", "sort_order")
VALUES
  (
    'essentiel',
    'active',
    '{"fr": "Essentiel", "en": "Essential"}',
    '{"fr": "Pour cibler quelques offres qui comptent.", "en": "To target a few offers that matter."}',
    '{"fr": ["5 candidatures complètes (analyse, CV et lettre)", "Crédits sans date d''expiration", "Paiement unique, sans abonnement", "TVA incluse"], "en": ["5 complete applications (analysis, CV and letter)", "Credits never expire", "One-time payment, no subscription", "VAT included"]}',
    40,
    590,
    false,
    10
  ),
  (
    'recherche-active',
    'active',
    '{"fr": "Recherche active", "en": "Active search"}',
    '{"fr": "Pour une recherche d''emploi suivie sur plusieurs semaines.", "en": "For a job search that runs over several weeks."}',
    '{"fr": ["20 candidatures complètes (analyse, CV et lettre)", "Crédits sans date d''expiration", "Paiement unique, sans abonnement", "TVA incluse"], "en": ["20 complete applications (analysis, CV and letter)", "Credits never expire", "One-time payment, no subscription", "VAT included"]}',
    145,
    1490,
    true,
    20
  ),
  (
    'intensif',
    'active',
    '{"fr": "Intensif", "en": "Intensive"}',
    '{"fr": "Pour postuler largement, en France comme à l''international.", "en": "To apply widely, at home and abroad."}',
    '{"fr": ["50 candidatures complètes (analyse, CV et lettre)", "Crédits sans date d''expiration", "Paiement unique, sans abonnement", "TVA incluse"], "en": ["50 complete applications (analysis, CV and letter)", "Credits never expire", "One-time payment, no subscription", "VAT included"]}',
    355,
    2900,
    false,
    30
  )
ON CONFLICT ("slug") DO NOTHING;
