# Review — US-030

## Acceptance criteria

1. `Les deux packs sont achetables` — Verified
   Evidence: shared `starter` and `pro` pack definitions now back `POST /billing/checkout-sessions`, the Next route `/credits/checkout`, and the dashboard purchase cards. API tests cover checkout-session creation; app tests cover redirect flow to Stripe Checkout.

2. `Le webhook met a jour le solde` — Verified
   Evidence: `BillingService.handleWebhook()` verifies the `Stripe-Signature` header against the raw payload and credits the existing ledger through `CreditsService.recordStripePurchase()`. The ledger now deduplicates repeated Stripe deliveries by checkout session/payment intent metadata.

3. `Les cas d'erreur de paiement sont geres` — Verified
   Evidence: invalid packs are rejected, missing Stripe configuration returns explicit service-unavailable errors, canceled checkout returns the user to the dashboard with a banner, and failed/irrelevant webhook events do not grant credits.

## Blocking findings

- None.

## Advisory findings

- Purchase-confirmation email remains future work from the vision (`§14.1`). The current story correctly stops at checkout + ledger integration.

## Verification summary

- `pnpm --filter @cvforge/api lint` ✅
- `pnpm --filter @cvforge/app lint` ✅
- `pnpm --filter @cvforge/api build` ✅
- `pnpm --filter @cvforge/app build` ✅
- `pnpm test -- --coverage` ✅

## Verdict

Pass.
