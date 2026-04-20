# Stage 3 — Implement
Agent: developer
Date: 2026-04-20

## Code changes

- Extended shared contracts to carry generated letter data:
  - `LetterContentUpdateRequest`
  - `LetterGenerationRequest`
  - `DraftApplication.letterGeneratedAt`
- Extended application persistence to store `letterContent` and `letterGeneratedAt` next to the existing CV fields.
- Expanded `CvGenerationService` and `CvGenerationController` with the LM path:
  - `POST /applications/:applicationId/generate-letter`
  - `GET /applications/:applicationId/letter`
  - `PUT /applications/:applicationId/letter`
- Added LM normalization and local-field reinjection rules so last name, phone, and email remain outside the OpenRouter payload and only reappear in stored/rendered content.
- Added app-side LM flow:
  - candidature action route + client button
  - `/letters/[applicationId]` page
  - focused LM editor + preview
  - save route to persist edits

## Quality gates

- `pnpm --filter @cvforge/api test` ✅
- `pnpm --filter @cvforge/app test` ✅
- `pnpm --filter @cvforge/types test` ✅
- `pnpm --filter @cvforge/api lint` ✅
- `pnpm --filter @cvforge/app lint` ✅
- `pnpm --filter @cvforge/api build` ✅
- `pnpm --filter @cvforge/app build` ⚠️ blocked by pre-existing permission error in `apps/app/.next/server/app-paths-manifest.json`

## Coverage impact

- `@cvforge/api` overall coverage after the change: `90.95%` statements / `79.96%` branches
- `apps/api/src/cv-generation/cv-generation.service.ts`: `99.5%` lines
- `apps/api/src/cv-generation/cv-generation.controller.ts`: `98.67%` lines
- `@cvforge/app` package tests are green, but package-level overall coverage remains below the project-wide target because of pre-existing unrelated surfaces; the new LM routes/pages are exercised by dedicated tests.

## Pass Verdict
✅ Implementation complete with one known environment advisory on app build.
