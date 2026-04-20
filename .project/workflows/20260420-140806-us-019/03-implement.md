# Stage 3 — Implement

Agent: `developer`
Verdict: `pass`

## Code Changes

- Extended the shared candidature contract in `packages/types` with explicit source metadata:
  - `sourceType: "url" | "text"`
  - `sourceLabel`
  - nullable `offerUrl` so pasted-text imports do not fake a URL
- Extended `apps/api/src/applications/` with a manual fallback path:
  - added `ApplicationsService.importFromText`
  - added `POST /applications/import-from-text` in `ApplicationsController`
  - reused the same OpenRouter extraction flow and persisted draft shape as the URL path
  - kept stable validation for empty and insufficient pasted content
- Updated the protected `/candidatures` page in `apps/app`:
  - preserved the URL form
  - added a second form with a labeled textarea for pasted offer text
  - displayed the candidature source from `sourceLabel`
  - added static MVP copy that documents the PDF fallback as deferred
- Updated the Next route handler `app/candidatures/import/route.ts` to branch on `sourceType` and forward to either the URL or text API endpoint
- Expanded tests across `packages/types`, API controller/service/store, app page, and app route handler

## Quality Gates

- `pnpm --filter @cvforge/types test` ✅
- `pnpm --filter @cvforge/api lint` ✅
- `pnpm --filter @cvforge/api test` ✅
- `pnpm --filter @cvforge/api build` ✅
- `pnpm --filter @cvforge/app lint` ✅
- `pnpm --filter @cvforge/app test` ✅
- `pnpm lint` ✅
- `pnpm test` ✅
- `pnpm --filter @cvforge/app build` ⚠️ blocked by the pre-existing `.next` file ownership issue:
  - `EACCES: permission denied, unlink '/home/devops/perso/projets/cvforge/apps/app/.next/server/app-paths-manifest.json'`

## Coverage Impact

- `@cvforge/types`: `100%` lines / `100%` branches
- `@cvforge/api`: `90.35%` lines / `81.49%` branches overall
- `src/applications` in `@cvforge/api`: `91.2%` lines
- `@cvforge/app`: `94.21%` lines / `87.11%` branches overall
- `app/app/candidatures/page.tsx`: `96.26%` lines
- `app/app/candidatures/import/route.ts`: `94.82%` lines

## PDF MVP Decision

- PDF fallback is explicitly deferred.
- Rationale:
  - no current upload endpoint in the candidature slice
  - no incoming file storage path for offer documents
  - no PDF parsing or rasterization boundary wired into this workflow
  - no sprint capacity to add the privacy-hardening and failure handling needed for a safe MVP import
- The MVP remains coherent because URL scraping plus pasted-text fallback now satisfy the executable candidature-creation path required by vision `§16`.
