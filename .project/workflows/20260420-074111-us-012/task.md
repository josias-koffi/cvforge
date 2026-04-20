# Task Context — US-012

- Sprint: `003`
- Task: `US-012`
- Title: `Protéger les routes par rôles, dont /admin`
- Workflow: `bug-triage`
- Run ID: `20260420-074111-us-012`

## Acceptance Criteria

1. Les routes admin sont inaccessibles aux `user`.
2. Les routes protégées exigent une session valide.
3. Les contrôles d'autorisation sont testés.

## Vision References

- `.project/vision.md` §3.3
- `.project/vision.md` §13.1
- `.project/vision.md` §16

## Current Observation

The current repository includes signed-session parsing plus an admin-only API session probe (`GET /auth/session/admin`), but it does not yet include:

- a real `/admin` route in `apps/app/app/`
- app-side route protection or middleware
- shared authorization helpers for protected pages
- automated tests proving unauthorized/forbidden access behavior for app routes
