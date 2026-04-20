# Stage 3 — Implement
Agent: developer
Date: 2026-04-20

## Summary

Implemented the full CV generation pipeline: OpenRouter pseudonymised prompt → normalised JSON → local field re-injection → stored CVDocumentContent, with frontend trigger and render page.

## Files Changed

### packages/types/src/index.ts
- Added `cvGeneratedAt: string | null` to `DraftApplication`
- Added `CvLocalFields`, `PromptSafeIdentity`, `PromptSafeProfileSections`, `PromptSafeProfile`, `CvGenerationRequest` types

### apps/api/src/applications/applications.types.ts
- Added `cvContent: CVDocumentContent | null` and `findById` to `StoredApplication` and `ApplicationsStore`

### apps/api/src/applications/applications.store.ts
- Added `findById()` method
- Normalise `cvContent` and `cvGeneratedAt` on hydration

### apps/api/src/applications/applications.service.ts
- Added `cvContent: null, cvGeneratedAt: null` to new application creation
- `stripRawOfferText` now also strips `cvContent` from list responses (keep data lean)

### apps/api/src/cv-generation/ (new module)
- `cv-generation.service.ts` — builds pseudonymised prompt, calls OpenRouter, normalises JSON, injects local fields, persists to application store
- `cv-generation.controller.ts` — `POST /applications/:id/generate-cv`, `GET /applications/:id/cv`
- `cv-generation.module.ts`
- `cv-generation.service.test.ts` (16 tests, 90.21% coverage)
- `cv-generation.controller.test.ts` (6 tests)
- `cv-generation.module.test.ts` (2 tests)

### apps/api/src/app.module.ts
- Registered `CvGenerationModule`

### apps/app/app/candidatures/generate-cv-button.tsx (new)
- Client component that reads profile from localStorage, builds `CvGenerationRequest`, POSTs to `/candidatures/generate-cv`, redirects to `/cv/:id`

### apps/app/app/candidatures/generate-cv/route.ts (new)
- Next.js route handler: receives profile + applicationId, forwards to API, returns `{ applicationId }`

### apps/app/app/cv/[applicationId]/page.tsx (new)
- Server component: fetches `CVDocumentContent` from API, renders using `CVHeader`, `ExperienceItem`, etc.

### apps/app/app/candidatures/page.tsx
- Added `GenerateCvButton` import and render
- Added "Voir le CV généré" link when `cvGeneratedAt` is set

## RGPD Compliance
The system prompt explicitly forbids transmitting phone, email, or lastName. The `promptProfile` structure mirrors `PromptSafeProfile` — no PII passes through OpenRouter. Local fields (`lastName`, `phone`, `email`) are injected server-side after the AI response is received.

## Quality Gates
- `pnpm lint` — ✅ all 6 packages pass
- `pnpm test` — ✅ 6/6 tasks successful (126 API + 97 app + 9 UI + 7 types tests)
- `pnpm --filter @cvforge/api build` — ✅ TypeScript compilation clean
- New code coverage: cv-generation service 90.21% lines, route 100% lines

## Pass Verdict
✅ Code changes described. Tests green. Coverage above threshold.
