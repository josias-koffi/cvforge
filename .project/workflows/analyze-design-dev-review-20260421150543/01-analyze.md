# Analyze — US-030

## Scope

`US-030` covers the first Stripe-backed purchase path for credit packs:

- Create a Stripe Checkout session for exactly two one-shot packs:
  - `Starter` at `999` cents for `550` credits
  - `Pro` at `1999` cents for `1400` credits
- Expose a purchase entry point from the authenticated product surface.
- Verify Stripe webhook deliveries and credit the existing ledger only after confirmed payment.
- Handle payment error states without granting credits.

## Out of scope

- The full "Mes credits" page and purchase-history UI (`US-031`)
- Email notifications after purchase (`vision §14.1` remains future work)
- Subscriptions, coupons, taxes beyond the fixed TTC prices already defined in the vision

## Product decisions confirmed

- Checkout stays Stripe-hosted rather than building a custom payment form.
- Currency stays `EUR`.
- Payments are one-shot only.
- The credits ledger from `US-029` remains the single source of truth for user balance.

## Acceptance criteria mapping

1. `Les deux packs sont achetables`
   - Evidence required: authenticated checkout-session creation for both packs and a UI entry point that redirects to Stripe Checkout.
2. `Le webhook met a jour le solde`
   - Evidence required: verified webhook signature, successful purchase event mapped to `CreditsService.recordStripePurchase()`, idempotent against duplicate deliveries.
3. `Les cas d'erreur de paiement sont geres`
   - Evidence required: invalid pack/configuration rejected cleanly, canceled checkout returns a user-visible state, failed or irrelevant webhook events do not credit the ledger.

## Risks / questions

- Stripe retries webhooks, so duplicate crediting is a blocking risk and must be prevented.
- Stripe signature verification requires the raw request body.
- Purchase history beyond successful ledger entries is intentionally not expanded into a second persistence path in this story.

## Verdict

Scope is clear and acceptance criteria are testable with targeted API and app tests.
