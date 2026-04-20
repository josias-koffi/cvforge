# Stage 1 — Analyze

## Scope

Implement a minimal but complete invitation flow on top of the existing auth slice:

- admin-only invitation creation endpoint
- nominative invitation payload bound to the invited email and target role
- invitation consumption path that creates a signed session for the invited email
- single-use and 48-hour expiry enforcement
- app-side invitation landing page so the generated link is actually consumable

## Constraints

- Do not change `.project/vision.md`.
- Keep the existing first-admin bootstrap rule intact.
- Do not add a new library or persistence layer.
- Do not invent the future admin panel; expose only the smallest surface needed for this sprint.

## Acceptance Mapping

1. Admin can generate a nominative link:
   implement a protected API endpoint that requires an admin session and accepts `email` plus `role`.
2. Link is single-use:
   persist invitation consumption state and reject any reused token.
3. Link expires after 48h:
   persist `expiresAt` with a fixed 48-hour TTL and reject expired tokens.

## Product Questions

- None blocking for this sprint. The future admin UI remains intentionally out of scope.

## Pass Verdict

Pass. Scope is clear and acceptance criteria are testable in API and app integration tests.
