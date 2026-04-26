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

- The task is still declared as `Workflow: release` in sprint `014`.
- Since the previous run, no implementation files changed; `git status --short` shows only workflow/state artifacts.
- Interview sessions still end with status completion only; there is still no structured post-interview report contract or persistence path.
- The dashboard still contains analytics support for optional `interviewReports`, but there is still no live API producer for that data.
