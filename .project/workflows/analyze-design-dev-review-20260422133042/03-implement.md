# Implement

Delivered:
- Added typed notification contracts in `@cvforge/types`
- Added Nest notifications slice with file-backed store, controller, config, and service
- Implemented idempotent J+7 follow-up reminder generation from candidature status history
- Added Next notification center page plus summary/read proxy routes
- Added reusable client bell with unread badge
- Extended `AppShell` with a header accessory slot and wired the bell across authenticated pages

Quality evidence:
- `pnpm --filter @cvforge/api test`
- `pnpm --filter @cvforge/app test`
- `pnpm --filter @cvforge/app lint`
- `pnpm --filter @cvforge/api lint`
- `pnpm --filter @cvforge/app build`
- `pnpm --filter @cvforge/api build`
- `pnpm test -- --coverage`

Coverage impact:
- Root coverage stayed above the blocking floor
- `@cvforge/app`: 84.83% lines / 73.27% branches
- `@cvforge/api`: 85.53% lines / 76.03% branches
