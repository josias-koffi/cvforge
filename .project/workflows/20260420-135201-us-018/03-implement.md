# Stage 3 — Implement

Agent: `developer`
Verdict: `pass`

## Code Changes

- Added a new API candidature-ingestion slice under `apps/api/src/applications/`:
  - `ApplicationsController` with authenticated `GET /applications` and `POST /applications/import-from-url`
  - `ApplicationsService` that validates URLs, scrapes HTML, normalizes visible text, calls `OPENROUTER_SERVICE`, and persists a draft candidature
  - `FileApplicationsStore` for minimal persisted draft records scoped by authenticated user
  - helper utilities and tests for HTML cleanup, metadata extraction, config, store, controller, service, and module wiring
- Registered `ApplicationsModule` in `AppModule`
- Added shared `DraftApplication` and `ExtractedOfferFields` contracts in `packages/types`
- Added a protected app page at `apps/app/app/candidatures/page.tsx`
- Added an app route handler at `apps/app/app/candidatures/import/route.ts` that forwards the form POST to the API while preserving the session cookie
- Documented the optional `APPLICATIONS_STATE_FILE` environment variable in `.env.example`

## Quality Gates

- `pnpm --filter @cvforge/types test` ✅
- `pnpm --filter @cvforge/api lint` ✅
- `pnpm --filter @cvforge/api test` ✅
- `pnpm --filter @cvforge/api build` ✅
- `pnpm --filter @cvforge/app lint` ✅
- `pnpm --filter @cvforge/app test` ✅
- `pnpm lint` ✅
- `pnpm test` ✅
- `pnpm --filter @cvforge/app build` ⚠️ blocked by pre-existing `.next` file ownership issue:
  - `EACCES: permission denied, unlink '/home/devops/perso/projets/cvforge/apps/app/.next/server/app-paths-manifest.json'`

## Coverage Impact

- `@cvforge/api`: `90.18%` lines, `81.41%` branches overall after the new application-ingestion tests
- `src/applications` in `@cvforge/api`: `90.81%` lines
- `@cvforge/app`: `94.02%` lines overall
- `app/app/candidatures/page.tsx`: `95.6%` lines
- `app/app/candidatures/import/route.ts`: `92.5%` lines

## Notes

- No new dependency or ADR was required.
- The MVP slice persists a draft candidature record but intentionally stops before status pipeline, fallback text, fallback PDF, or company-enrichment stories.
