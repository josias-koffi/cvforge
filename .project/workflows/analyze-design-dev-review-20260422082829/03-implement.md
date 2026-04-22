# Implement — US-031

Verdict: pass

Code changes:
- added `apps/app/app/credits/page.tsx` as the authenticated "Mes credits" screen
- added `apps/app/app/credits/page.test.tsx`
- added `/credits` to app navigation in `apps/app/app/content.ts`
- added a dashboard link to the new credits page in `apps/app/app/dashboard/page.tsx`
- extended `apps/app/app/dashboard/page.test.tsx`

Implementation details:
- reuses `GET /credits/me` and the existing cookie-forwarding server-fetch pattern
- shows current balance, low-balance banner, purchase cards, and mixed ledger history
- computes an estimated number of full applications remaining from the vision cost model (`17` credits)
- keeps Stripe purchase entry on the page through the existing `/credits/checkout` route

Validation:
- `pnpm --filter @cvforge/app test -- --run app/credits/page.test.tsx app/dashboard/page.test.tsx` ✅
- `pnpm --filter @cvforge/app lint` ✅
- `pnpm --filter @cvforge/app build` ✅

Coverage impact:
- new page behavior is covered by dedicated render tests for normal and low-balance states
- dashboard test coverage was updated for the new credits-page link
