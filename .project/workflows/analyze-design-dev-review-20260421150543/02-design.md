# Design — US-030

## Architecture decision

Add a dedicated API billing slice instead of folding Stripe logic into `credits/` or the Next app:

- `apps/api/src/billing/`
  - config resolution for Stripe secrets and app return URLs
  - authenticated checkout-session creation
  - webhook verification and event handling
- `apps/app/app/credits/checkout/route.ts`
  - thin server route that forwards the authenticated request to the API and redirects to Stripe
- `apps/app/app/dashboard/page.tsx`
  - small "Acheter des credits" section with the two packs

## Data flow

1. Authenticated user submits `Starter` or `Pro` from the dashboard.
2. Next route proxies the cookie-backed request to `POST /billing/checkout-sessions`.
3. API creates a Stripe-hosted Checkout Session with pack metadata and app success/cancel URLs.
4. Stripe redirects the customer back to the app after completion or cancellation.
5. Stripe sends a webhook to `POST /billing/stripe/webhook`.
6. API verifies the `Stripe-Signature` header against the raw payload and records the purchase in `CreditsService`.

## Design constraints

- Reuse `recordStripePurchase()` for successful purchases.
- Add idempotency in billing handling so webhook retries cannot double-credit.
- Keep payment errors explicit:
  - checkout creation failures return clear messages
  - canceled checkout returns to the dashboard with a visible banner
  - failed/irrelevant webhook events are acknowledged without crediting

## UI decision

This is a light UI addition, not a new page:

- Show two pack cards on the dashboard.
- Each pack uses a normal `<form method="POST">` to a Next route for progressive enhancement.
- Show a compact success/cancel/error banner using query params on the dashboard.

## Accessibility

- Purchase actions remain keyboard reachable as native form submit buttons.
- Error/success copy is rendered as plain text in the dashboard content flow.

## Verdict

The design fits the analyzed scope, preserves the existing architecture, and keeps the future credits page unblocked.
