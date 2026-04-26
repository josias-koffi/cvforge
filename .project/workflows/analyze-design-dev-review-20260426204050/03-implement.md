Verdict: ✅ pass

Implementation summary:
- Added a shared `InterviewReport` contract and linked interview sessions to applications.
- Extended the interview backend to validate the linked application, generate a structured report at `finishSession`, persist it on the session, and append it to the owned application.
- Updated the interview UI to select a candidature before start and render the generated report after completion.
- Updated dashboard analytics and score displays to consume persisted interview reports from `/applications` with interview scoring normalized to `/10`.

Primary areas changed:
- `packages/types/src/index.ts`
- `apps/api/src/applications/*`
- `apps/api/src/interview/*`
- `apps/app/app/interview/*`
- `apps/app/app/dashboard/*`

Verification:
- Targeted types, API, and app Vitest suites passed for the touched interview/dashboard flows.
- `pnpm lint` passed.
- `pnpm build` passed.
- `pnpm test -- --coverage` passed at workspace level.

Coverage notes:
- Root coverage run completed successfully.
- `@cvforge/api` root coverage: `82.45%` lines / `73.53%` branches.
- `apps/api/src/interview/interview.service.ts` root coverage: `93.88%`.
- `@cvforge/app` targeted interview/dashboard suites passed; the touched interview flow is covered by dedicated route/page/component tests.
