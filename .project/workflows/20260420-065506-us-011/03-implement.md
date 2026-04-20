# Stage 3 — Implement

## Code Changes

- Extended the file-backed auth state with persisted invitations in `apps/api/src/auth/auth-account-store.ts`.
- Added invitation domain types and service/controller endpoints in:
  - `apps/api/src/auth/auth.types.ts`
  - `apps/api/src/auth/auth.service.ts`
  - `apps/api/src/auth/auth.controller.ts`
- Added invitation coverage in:
  - `apps/api/src/auth/auth-account-store.test.ts`
  - `apps/api/src/auth/auth.service.test.ts`
  - `apps/api/src/auth/auth.controller.test.ts`
- Added the app-side invitation landing and acceptance flow in:
  - `apps/app/app/register/invitation/page.tsx`
  - `apps/app/app/register/invitation/accept/route.ts`
  - corresponding tests under the same folder

## Behavior Delivered

- Admin-only invitation creation using the existing signed session cookie.
- Nominative invitations bound to one email and one target role (`admin` or `user`).
- Invitation links that expire exactly 48 hours after creation.
- Single-use invitation consumption that sets a signed session and persists the invited role.

## Validation

- `pnpm --filter @cvforge/api lint` ✅
- `pnpm --filter @cvforge/app lint` ✅
- `pnpm --filter @cvforge/api test` ✅
- `pnpm --filter @cvforge/app test` ✅
- `pnpm test` ✅
- `pnpm --filter @cvforge/api build` ✅
- `pnpm --filter @cvforge/app exec tsc -p tsconfig.json --noEmit` ✅
- `pnpm build` ⚠️ blocked by pre-existing `apps/app/.next` artifacts owned by `nobody`, which Next cannot delete in this session

## Coverage Impact

- `@cvforge/api`: 88.52% lines, 80.11% branches after the invitation changes
- `@cvforge/app`: 87.28% lines, 78.57% branches overall; new invitation files are covered by targeted tests

## Pass Verdict

Pass with one environment advisory: the repository-wide build command is blocked by stale generated files outside the feature code path.
