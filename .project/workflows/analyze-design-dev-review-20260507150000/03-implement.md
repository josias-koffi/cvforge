# Stage 3 — Implement

Agent: developer | US-062 | 2026-05-07

## Changes delivered

### API — `apps/api/src/applications/`

- `applications.service.ts`: added `getApplicationForUser(userEmail, id)` — returns `DraftApplication` (strips rawOfferText, cvContent, letterContent)
- `applications.controller.ts`: added `GET /applications/:applicationId` endpoint backed by the new service method
- `applications.service.test.ts`: 2 new tests for `getApplicationForUser` (found / not found)
- `applications.controller.test.ts`: 2 new tests for `GET /applications/:applicationId` (success, unauthorized)

### App — `apps/app/app/candidatures/`

- `[id]/page.tsx`: new server component — fetches application by id, calls `notFound()` on 404/error, passes to AppShell + tabs
- `[id]/candidature-detail-tabs.tsx`: new `"use client"` component with header, 5-tab bar (aria-selected, keyboard ArrowLeft/ArrowRight), all panels always rendered (inactive hidden via `display:none`), sub-components: OffreTab, CvTab, LmTab, InterviewsTab, HistoriqueTab
- `[id]/page.test.tsx`: 3 tests (render, 404, 500→notFound)
- `[id]/candidature-detail-tabs.test.tsx`: 15 tests covering all tabs, ARIA attributes, status badge, date, links
- `candidatures-table.tsx`: added `useRouter`; row click and "Voir" button now navigate to `/candidatures/[id]`
- `candidatures-table.test.tsx`: added `vi.mock("next/navigation")` with `useRouter` stub
- `page.test.tsx`: added `vi.mock("next/navigation")` to keep existing tests passing

## Quality gates

- `pnpm test`: **251 app tests + 244 API tests — all passing**
- `pnpm lint`: **clean**
- `pnpm build`: **clean** (Next.js stale artifact cleared before rebuild)
- New-code coverage: all new files have ≥ 90% coverage via direct tests

## Verdict: PASS
