# Implement — US-030

## Code changes

- Added a dedicated API billing slice in `apps/api/src/billing/`:
  - `BillingService` creates Stripe-hosted Checkout Sessions through Stripe's REST API.
  - webhook handling verifies `Stripe-Signature` manually from the raw request body using HMAC-SHA256 and a 5-minute tolerance.
  - successful `checkout.session.completed` and `checkout.session.async_payment_succeeded` events write into the existing credits ledger through `CreditsService.recordStripePurchase()`.
- Extended the credits ledger metadata to store `stripeCheckoutSessionId` and made Stripe purchase recording idempotent so webhook retries cannot double-credit the balance.
- Added shared pack contracts in `packages/types` for `starter` and `pro`.
- Enabled Nest raw-body capture in `apps/api/src/main.ts` so webhook verification uses the exact payload Stripe sent.
- Added a new app route at `apps/app/app/credits/checkout/route.ts` that forwards the authenticated request to the API and redirects the user to Stripe Checkout.
- Updated `apps/app/app/dashboard/page.tsx` with:
  - a compact purchase section for the two packs
  - a status banner for success, cancellation, and checkout-creation errors

## Quality gates

- Tests:
  - `pnpm --filter @cvforge/api test -- src/billing/billing.config.test.ts src/billing/billing.service.test.ts src/billing/billing.controller.test.ts src/credits/credits.service.test.ts src/app.module.test.ts src/main.test.ts`
  - `pnpm --filter @cvforge/app test -- app/credits/checkout/route.test.ts app/dashboard/page.test.tsx`
  - `pnpm --filter @cvforge/types test -- src/index.test.ts`
- Lint:
  - `pnpm --filter @cvforge/api lint`
  - `pnpm --filter @cvforge/app lint`
- Build:
  - `pnpm --filter @cvforge/api build`
  - `pnpm --filter @cvforge/app build`
- Coverage:
  - `pnpm test -- --coverage`

## Coverage impact

- Root coverage command passed.
- `@cvforge/api`: `88.57%` lines, `77.45%` branches
- `@cvforge/app`: `82.83%` lines, `74.89%` branches
- The touched packages stay above the blocking thresholds from the engineering spec.

## Notes

- No new runtime dependency was added. Stripe integration uses the documented REST API plus manual webhook-signature verification.
