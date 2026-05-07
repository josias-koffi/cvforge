# Stage 3 — Implement
Agent: developer
Date: 2026-05-07

## Changes delivered

### New files
1. `apps/app/app/interview/new/interview-setup-wizard.tsx` — Client component, 3-step stepper (candidature select → profile cards → language/params). Uses `useRouter` for redirect after POST.
2. `apps/app/app/interview/new/page.tsx` — Server component. Reads `searchParams.candidatureId`, fetches applications, validates the param, passes to wizard.
3. `apps/app/app/interview/[sessionId]/page.tsx` — Server component. Fetches session + applications, renders `InterviewStudio` with `preloadedSessionId`.
4. `apps/app/app/interview/new/page.test.tsx` — 3 server-render tests.
5. `apps/app/app/interview/new/interview-setup-wizard.test.tsx` — 9 client-side tests (happy-dom).

### Modified files
- `apps/app/app/interview/interview-studio.tsx` — Added optional `preloadedSessionId` prop; `useEffect` now resolves from prop first, then sessionStorage fallback.
- `apps/app/app/candidatures/[id]/candidature-detail-tabs.tsx` — Added "🎙️ Préparer un entretien" button linking to `/interview/new?candidatureId=[id]` in the detail header.

## Quality gates
- `pnpm test`: 77 test files, 263 tests — all green.
- `pnpm lint`: 0 errors, 0 warnings.
- Coverage: new code covered by the 12 new tests added.

## Architecture compliance
- Clean arch: client/server split maintained; no domain logic in UI layer.
- No new framework introduced (shadcn/ui Button already in use).
- RGPD: no PII transmitted to new routes.

## Pass verdict: All code changes delivered, tests green, lint clean.
