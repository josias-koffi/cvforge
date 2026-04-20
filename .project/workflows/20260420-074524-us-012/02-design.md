# Stage 2 — Design

## UX Shape

- Treat `/` as the authenticated candidate dashboard entrypoint.
- Add `/admin` as a minimal admin-only page that confirms privileged access without inventing the later admin panel.
- Add `/forbidden` as a neutral, accessible explanation page for authenticated users lacking the `admin` role.

## Interaction Rules

- Missing or expired session on a protected route:
  Redirect to `/login?error=session_required`.
- Authenticated `user` hitting `/admin`:
  Redirect to `/forbidden`.
- Authenticated `admin` hitting `/admin`:
  Show a minimal confirmation card with session identity.

## Accessibility Notes

- The new denial page uses a semantic `main`, a single `h1`, explanatory body copy, and a clear navigation link back to the candidate dashboard.
- The admin confirmation card reuses the existing paper-style card treatment and keeps contrast aligned with the current token set.

## Risk

- Server-side route checks rely on forwarding the signed cookie to the Nest API. Tests must explicitly cover cookie forwarding and redirect behavior so the route protection does not silently regress.
