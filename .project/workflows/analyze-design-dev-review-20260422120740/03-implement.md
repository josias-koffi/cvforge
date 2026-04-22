Implementation landed in the existing auth/credits boundaries.

Code changes:
- Added `listAccounts()` to the auth account store/service so admin code can enumerate persisted users.
- Added `GET /credits/admin/users` to join auth accounts with credit summaries, latest activity, latest manual grant, server-side filtering, and pagination.
- Kept manual grants on the existing `POST /credits/admin/grants` path, preserving the append-only ledger as the logging mechanism.
- Replaced the placeholder `/admin` page with a real admin users panel and added `/admin/grant-credits` as the Next route proxy for manual grants.

Quality gates:
- `pnpm --filter @cvforge/api test` ✅
- `pnpm --filter @cvforge/app test` ✅
- `pnpm --filter @cvforge/api lint` ✅
- `pnpm --filter @cvforge/app lint` ✅
- `pnpm --filter @cvforge/api build` ✅
- `pnpm --filter @cvforge/app build` ✅

Coverage impact: targeted API and app tests were added for the new admin query, account listing, admin page, and grant route.
