# ADR-007: Add OAuth2 social login (Google + LinkedIn) via Passport.js
Date: 2026-05-07
Status: accepted

## Context

`US-052` (V2.0) requires evaluating Google and LinkedIn social login as a
complement to the passwordless magic-link system introduced in `US-009`. The
vision §3.1 explicitly defers social login to V2 and requires the passwordless
path to remain available.

The backend is NestJS and already uses Passport.js (`passport-jwt`) for JWT
validation. The frontend is Next.js. Auth state is managed server-side via
signed session cookies.

Two hard constraints apply:
- §3.1: passwordless must remain available; social login is additive, not a
  replacement.
- §15 / RGPD: transfers to Google (US) and Microsoft/LinkedIn (US) require
  Standard Contractual Clauses (SCC); a token revocation endpoint is mandatory
  to support the right to erasure.

## Decision

Add `passport-google-oauth20` and `passport-linkedin-oauth2` to `@cvforge/api`.
OAuth flows are initiated and handled entirely in the NestJS backend; the Next.js
app redirects to `/auth/google` and `/auth/linkedin` and receives a session cookie
on callback — the same shape as the existing magic-link session flow.

Security requirements (non-negotiable):
- **PKCE** (code_challenge / code_verifier) for Google OAuth2.
- **Minimal scopes**: Google → `email profile`; LinkedIn → `r_emailaddress r_liteprofile` only.
- **Session regeneration** after OAuth callback to prevent session fixation.
- **Account linkage**: if an account with the same email already exists
  (passwordless or other provider), link automatically and do not create a
  duplicate. If no match, create a new account.
- **Token revocation endpoint**: `DELETE /auth/social/:provider/revoke` — required
  before production deployment to satisfy GDPR right to erasure.

Privacy policy update required at the same time:
- Disclose that Google LLC and Microsoft (LinkedIn) receive the user's email
  address during sign-in.
- Reference the SCC basis for US data transfer.

## Consequences

- One auth boundary (NestJS Passport) handles all strategies: JWT, magic-link,
  Google OAuth2, LinkedIn OAuth2.
- The Next.js app remains a thin consumer of the session cookie — no auth logic
  added to the frontend.
- PKCE and scope minimisation reduce the OAuth attack surface to the minimum
  required by the product.
- The revocation endpoint is a hard prerequisite for go-live; it must be
  implemented in the same story as the OAuth strategies.
- Future providers (GitHub, Apple) can be added as additional Passport strategies
  without changing the session contract.

## Alternatives considered

- **Auth.js (next-auth v5)**: designed for Next.js only; would require duplicating
  session management across Next.js and NestJS, breaking the single-backend auth
  boundary established in `US-009`. Rejected.
- **Independent OAuth library (openid-client)**: more control but requires
  hand-rolling session integration already covered by Passport guards. Rejected for
  MVP complexity.
- **Google only, no LinkedIn**: LinkedIn is cited explicitly in vision §3.1 and
  §16; deferring it adds a future ADR with no architectural benefit. Rejected.
