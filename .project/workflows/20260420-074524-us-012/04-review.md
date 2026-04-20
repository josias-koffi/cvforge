# Stage 4 — Review

## Acceptance Criteria

1. Les routes admin sont inaccessibles aux `user`.
   Verified by `apps/app/app/auth/session.ts`, which redirects `403` admin-session failures to `/forbidden`, plus `apps/app/app/auth/session.test.ts` and the API regression in `apps/api/src/auth/auth.controller.test.ts`.
2. Les routes protégées exigent une session valide.
   Verified by `apps/app/app/page.tsx`, which now awaits `requireSession()`, plus `apps/app/app/auth/session.test.ts` proving unauthenticated access redirects to `/login?error=session_required`.
3. Les contrôles d'autorisation sont testés.
   Verified by the new app tests in `apps/app/app/auth/session.test.ts`, `apps/app/app/page.test.tsx`, `apps/app/app/admin/page.test.tsx`, `apps/app/app/forbidden/page.test.tsx`, and the API controller regression test.

## Blocking Findings

- None in the implemented feature slice.

## Advisories

- `pnpm --filter @cvforge/app build` remains blocked by pre-existing `.next` artifacts owned by another user, so the app build could not be revalidated end to end on this machine.

## Quality Gate Evidence

- Lint: pass
- Root tests: pass
- App tests: pass
- API tests: pass
- API build: pass
- App build: blocked by stale `.next` ownership

## Verdict

Pass. Every acceptance criterion is explicitly verified, and the remaining build issue is an environment advisory already observed in prior runs.
