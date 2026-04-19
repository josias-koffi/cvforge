# Stage 4 — Review

## Acceptance Criteria Verification

1. The login passwordless works end to end
   - Verified by the implemented app flow in `apps/app/app/login/` plus the real API contract in `apps/api/src/auth/`.
   - The request page generates a magic link, the link is consumed by the API, and the success page verifies the returned session through `/auth/session`.
   - Verdict: `passed`
2. Sessions are persisted securely
   - Verified by the signed, expiring `HttpOnly` cookie issued in `apps/api/src/auth/auth.service.ts`.
   - Cookie signing, expiry handling, tamper rejection, and single-use magic links are covered by `apps/api/src/auth/auth.service.test.ts`.
   - Verdict: `passed`
3. The session duration is documented even if the final value still needs confirmation
   - Verified in `.env.example` with `AUTH_SESSION_TTL_DAYS=7` and an explicit note that the final product decision remains pending.
   - Reinforced in the `/login` UI copy so the current recommendation is visible during the flow.
   - Verdict: `passed`

## Blocking Findings

- None.

## Advisories

- Real email delivery is still a follow-up concern. The current sprint proves the auth contract by previewing the generated magic link until the mailer story is implemented.

## Evidence

- `pnpm lint` passed.
- `pnpm test` passed.
- `pnpm build` passed.
- `@cvforge/api` coverage: `87%` lines, `80.64%` branches.
- `@cvforge/app` coverage: `85.41%` lines, `88%` branches.

## Pass Check

- Every acceptance criterion is verified or rejected explicitly: yes
- Blocking defects are listed separately from advisories: yes
