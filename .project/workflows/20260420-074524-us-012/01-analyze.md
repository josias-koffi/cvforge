# Stage 1 — Analyze

## Scope

`US-012` stays limited to role-based route protection on top of the existing passwordless auth slice. The story does not introduce a full admin panel; it only needs a real protected admin surface plus session-based access control for protected routes.

## Acceptance Mapping

1. Admin routes inaccessible to `user`:
   Prove with an admin-only app route and authorization behavior that rejects non-admin sessions.
2. Protected routes require a valid session:
   Prove with a candidate dashboard route that redirects unauthenticated access away from protected content.
3. Authorization controls are tested:
   Prove with app-side tests for session/admin redirects and API-controller regression coverage for the admin session probe.

## Missing Product Questions

- None blocking for this story. The final session-duration value remains a separate product decision already tolerated by `US-009`.

## Delivery Decision

Implement one shared server-side auth helper in `apps/app`, protect the dashboard route (`/`) and a new `/admin` route with it, and provide a public denial page for forbidden admin access.
