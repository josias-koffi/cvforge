# Stage 3 — Implement

## Code Changes

- Added `apps/api/src/auth/` with:
  - env-driven auth configuration
  - magic-link issuance and single-use consumption
  - signed, expiring cookie-session handling
  - session inspection and logout endpoints
- Updated `apps/api/src/app.module.ts` and `apps/api/src/main.ts` to register the auth module and enable credentialed CORS for the app origin.
- Added a minimal passwordless flow to `apps/app`:
  - `/login`
  - `/login/request`
  - `/login/check-email`
  - `/login/success`
- Added app-side helpers and tests for auth config, request routing, and session fetch behavior.
- Updated `.env.example` with the session-duration and cookie-related auth settings, including the recommended `AUTH_SESSION_TTL_DAYS=7` default.
- Updated the app home page to surface the new passwordless entry point.

## Quality Gates

- `pnpm lint` — passed
- `pnpm test` — passed
- `pnpm build` — passed

## Coverage Impact

- `@cvforge/api` coverage after the change: `87%` lines, `80.64%` branches.
- `@cvforge/app` coverage after the change: `85.41%` lines, `88%` branches.
- Both touched packages meet the blocking repository thresholds after the added tests.

## Blocking Issues

- None.

## Notes

- Because SMTP delivery is a separate concern, the current flow exposes the generated magic link in the app so the passwordless contract can be exercised end to end now and later routed through email without changing the auth core.

## Pass Check

- Code changes are described: yes
- Tests and quality gates are run or explicitly blocked: yes
- Coverage impact is stated: yes
