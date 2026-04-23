Implemented a full privacy slice across API, app, and docs.

API:

- Added `privacy` module/controller/service with:
  - `GET /privacy/export`
  - `GET /privacy/retention-policy`
  - `POST /privacy/delete-account`
- Extended file-backed stores so deletion can:
  - remove owned applications, notifications, credit entries, and auth account data,
  - remove invitations targeting the deleted user,
  - anonymize third-party admin references in grants/invitations.
- Added retention-policy constants and tests.

App:

- Added `/profile/privacy` page and client manager for export/delete.
- Added app proxy routes:
  - `/profile/privacy/export`
  - `/profile/privacy/delete`
- Export now merges API data with browser-local base profile.
- Delete clears local base-profile and onboarding-draft storage keys and clears the auth cookie.
- Added link from `/profile` to the privacy page.

Documentation:

- Added `docs/privacy-retention-policy.md` with explicit MVP retention rules and the planned 30-day audio purge.

Quality gates:

- `pnpm --filter @cvforge/api lint`
- `pnpm --filter @cvforge/api test`
- `pnpm --filter @cvforge/app lint`
- `pnpm --filter @cvforge/app test`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm test -- --coverage`

Coverage impact:

- Root coverage remains above the blocking floor.
- `@cvforge/app` coverage: `83.99%` lines, `72.28%` branches.
- `@cvforge/api` coverage: `87.94%` lines, `76.36%` branches.
