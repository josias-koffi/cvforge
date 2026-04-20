# Stage 3 — Implement

## Verdict
Pass

## Code changes
- Added `CvPdfExportService` in `apps/api/src/cv-generation/cv-pdf-export.service.ts`
- Added dedicated PDF export tests in `apps/api/src/cv-generation/cv-pdf-export.service.test.ts`
- Extended `CvGenerationController` with `GET /applications/:applicationId/cv/pdf`
- Registered the new service in `CvGenerationModule`
- Added an authenticated app route at `apps/app/app/cv/[applicationId]/pdf/route.ts`
- Added route tests in `apps/app/app/cv/[applicationId]/pdf/route.test.ts`
- Added a download button to the CV editor
- Updated the CV page test to assert the export action appears

## Quality gates
- `pnpm --filter @cvforge/api lint` passed
- `pnpm --filter @cvforge/app lint` passed
- `pnpm --filter @cvforge/api test -- src/cv-generation/cv-pdf-export.service.test.ts src/cv-generation/cv-generation.controller.test.ts` passed
- `pnpm --filter @cvforge/app test -- "app/cv/[applicationId]/pdf/route.test.ts" "app/cv/[applicationId]/page.test.tsx" "app/cv/[applicationId]/save/route.test.ts"` passed

## Coverage
- New API PDF service coverage is above the blocking threshold for the touched slice
- The app slice remains consistent with the existing document flow and the new route is covered by tests

