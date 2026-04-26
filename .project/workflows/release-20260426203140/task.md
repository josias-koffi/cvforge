# Sprint 014 — US-049

## Task

Generer le rapport post-interview avec metriques et notes.

## Acceptance Criteria

- Un rapport structure est genere en fin de session
- Les notes et metriques sont persistees
- Le dashboard peut consommer ces scores

## Scope Frozen

- `apps/api/src/interview/interview.service.ts`
- `apps/api/src/interview/interview.controller.ts`
- `apps/api/src/interview/interview.types.ts`
- `apps/api/src/applications/applications.types.ts`
- `apps/api/src/applications/applications.store.ts`
- `packages/types/src/index.ts`
- `apps/app/app/interview/interview-studio.tsx`
- `apps/app/app/interview/[sessionId]/finish/route.ts`
- `apps/app/app/dashboard/analytics.ts`
- `apps/app/app/dashboard/page.tsx`

## Evidence

- Interview sessions persist transcript chunks, AI reply text, status, language, and recruiter profile, but no structured post-interview report.
- No shared contract defines interview report metrics or notes; `InterviewSessionSummary` ends at transcript and AI response.
- No application persistence model stores interview reports or interview scores; `StoredApplication` contains CV/LM data only.
- The dashboard analytics code can read optional `interviewReports`, but those values are test fixtures only and are not produced by the API.
