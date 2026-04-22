Implemented the missing admin-template advanced operations end to end.

Code changes:
- Added template analytics/export support in `apps/api/src/templates`: `GET /templates/analytics`, `GET /templates/export.csv`, analytics summary + CSV generation, and application-backed usage aggregation.
- Extended application persistence with `cvTemplateId` / `letterTemplateId`, plus `listAll()` for admin analytics.
- Updated CV/LM generation flows to persist the default template used for each generated document.
- Added app-side CSV proxy route at `apps/app/app/admin/templates/export/route.ts`.
- Extended `/admin/templates` with visible analytics cards, top templates, and export entry.

Validation:
- Targeted tests passed for API and app touched areas.
- `pnpm --filter @cvforge/api lint`
- `pnpm --filter @cvforge/api build`
- `pnpm --filter @cvforge/app test -- app/admin/templates/page.test.tsx app/admin/templates/export/route.test.ts`
- `pnpm --filter @cvforge/app build`

Coverage impact:
- New behavior is covered by targeted API/app tests around analytics, export, persistence, and generation tracking.
