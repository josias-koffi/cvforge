# Stage 1 — Reproduce

## Agent

`developer`

## Bug Report

`US-012` expects role-protected routes, including `/admin`, plus tests covering authorization behavior.

## Stable Reproduction

1. Inspect `apps/app/app/` and confirm there is no `/admin` route or protected-route wrapper.
2. Inspect the auth slice and confirm the only admin-specific check is `GET /auth/session/admin` in `apps/api/src/auth/auth.controller.ts`.
3. Search for route-level guards or middleware in `apps/app` and confirm none exist.

## Evidence

- `find apps/app/app -maxdepth 3 -type f` shows only public login and invitation pages.
- `apps/api/src/auth/auth.controller.ts` exposes `GET /auth/session` and `GET /auth/session/admin`.
- `rg -n "middleware|guard|protected|/admin" apps/app apps/api` finds no frontend route-protection mechanism or `/admin` page.

## Result

Reproduction is stable: the authorization primitives exist only at the API-session-check level, so the story acceptance criteria are currently unmet.
