# Stage 4 — Review

## Acceptance Criteria

1. Un admin peut generer un lien d'invitation nominatif.
   Verified by `POST /auth/invitations`, which requires an admin session and persists `{ email, role, createdBy, expiresAt }`, plus controller/service tests covering admin-only creation.
2. Le lien n'est consommable qu'une seule fois.
   Verified by persisted `consumedAt` state in `FileAuthAccountStore.consumeInvitation(...)` and regression tests that reject a second consumption.
3. Le lien expire apres 48h.
   Verified by the fixed 48-hour TTL in `AuthService.createInvitation(...)` and service tests that reject preview/consumption after the deadline.

## Blocking Findings

- None in the implemented feature slice.

## Advisories

- `pnpm build` remains blocked by pre-existing `.next` files under `apps/app/.next` owned by `nobody`. This is an environment cleanup issue, not a logic defect in `US-011`.

## Quality Gate Evidence

- Lint: pass
- Tests: pass
- Root `pnpm test`: pass
- API build: pass
- App TypeScript compile: pass
- Root `pnpm build`: blocked by stale generated artifacts

## Verdict

Pass. Every acceptance criterion is explicitly verified.
