# Stage 3 — Implement

## Code Changes

- Added `apps/app/app/auth/session.ts` to centralize server-side session verification for protected and admin-only routes by forwarding the current cookie jar to the API auth endpoints.
- Updated `apps/app/app/page.tsx` so the candidate dashboard now requires a valid session before rendering.
- Added `apps/app/app/admin/page.tsx` as a minimal admin-only surface backed by the admin session probe.
- Added `apps/app/app/forbidden/page.tsx` as the public access-denied route for authenticated non-admin users.
- Added app tests for the protected dashboard, admin page, forbidden page, and server-side authorization helper redirects.
- Extended `apps/api/src/auth/auth.controller.test.ts` to verify that the admin session endpoint rejects both missing and non-admin sessions.

## Quality Gates

- `pnpm lint`: pass
- `pnpm test`: pass
- `pnpm --filter @cvforge/api build`: pass
- `pnpm --filter @cvforge/app build`: blocked by stale `apps/app/.next` files owned by another user on this machine

## Coverage Impact

- `@cvforge/app`: 89.20% statements / 81.81% branches overall; touched files in this story are fully or near-fully covered, with `app/page.tsx`, `app/admin/page.tsx`, and `app/auth/session.ts` directly exercised.
- `@cvforge/api`: 89.02% statements / 81.35% branches overall after the added admin-session regression test.

## Engineering Note

The build blocker is environmental, not a logic defect in the `US-012` implementation. The Next build cannot clean pre-existing `.next` artifacts because they are owned by another user.
