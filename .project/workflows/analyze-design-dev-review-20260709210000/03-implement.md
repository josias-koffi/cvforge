<!-- generated-by: sprint 020 US-074 · stage 03 (developer) -->
---
tags: [workflow/stage, stage/implement]
parent: "[[workflows/runs/analyze-design-dev-review-20260709210000/task]]"
agent: "[[agents/developer/agent]]"
---
# Stage 3 — Implement (developer)

### Verdict: PASS
### Summary (≤ 100 words)
Added `apps/app/app/auth-column.tsx` (170L) — shared `paperTokens`-based primitives (`AuthColumn`, `AuthHeading`, `AuthCopy`, `AuthErrorBanner` with `role="alert"`, `AuthFactList`/`Term`/`Value`, `AuthConsentField`, `AuthSubmitButton`, `AuthFooterLink`). Rewrote `login/page.tsx` (86L), `login/check-email/page.tsx` (55L), `register/invitation/page.tsx` (112L) to consume it: fixed 420px centered column, no card chrome around forms, all hardcoded colors/fonts replaced by tokens. Preserved existing element `id`/`name`/text so all pre-existing tests pass unmodified. `/login/success` and both `route.ts` handlers untouched (no markup).

### Refactors applied
- `login/page.tsx`, `login/check-email/page.tsx`, `register/invitation/page.tsx` — eliminated 3x duplicated inline `<main>` wrapper and repeated card/dl/button/consent markup into shared `auth-column.tsx` primitives (lines saved: ~140 net across the three pages vs. keeping duplicated styles inline).

### Next action
Hand off to qa-reviewer for acceptance-criteria verification and quality gates.

## Evidence
- `pnpm --filter @cvforge/app test -- --run`: 78 files / 256 tests passing (pre-existing `act(...)` warnings in interview suites, unrelated to this change).
- `pnpm --filter @cvforge/app lint`: 0 errors/warnings.
- `npx vitest run --coverage` (touched paths): `auth-column.tsx` 100%/100%/100%/100%; `login/page.tsx` 100%; `login/check-email/page.tsx` 100% lines; `register/invitation/page.tsx` 98.55% lines (pre-existing branch gap, line 50, unrelated to this change).
- `pnpm --filter @cvforge/app build`: succeeds, `/login`, `/login/check-email`, `/login/success`, `/register/invitation`, `/register/invitation/accept` all compile.
