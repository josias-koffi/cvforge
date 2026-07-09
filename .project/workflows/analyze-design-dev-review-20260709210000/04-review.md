<!-- generated-by: sprint 020 US-074 · stage 04 (qa-reviewer) -->
---
tags: [workflow/stage, stage/review]
parent: "[[workflows/runs/analyze-design-dev-review-20260709210000/task]]"
agent: "[[agents/qa-reviewer/agent]]"
---
# Stage 4 — Review (qa-reviewer)

### Verdict: PASS
### Summary (≤ 100 words)
Verified all 5 acceptance criteria against the shipped diff (3 pages + 1 new shared component, 423 lines total). 256/256 app tests pass, lint clean, coverage 100% on all touched files except one pre-existing 71.42% branch line in `invitation/page.tsx` (unrelated to this change, unchanged from before). Build succeeds for all 5 affected routes.

### Acceptance criteria verification
1. **Narrow centered column, no mobile stretch** — `AuthColumn` fixes `maxWidth: 420px`, `margin: 0 auto`, applied to `login/page.tsx`, `login/check-email/page.tsx` (both `/login/*` routes); no breakpoint widens it at `lg`/`xl`. `/login/success` has no markup (redirect-only, confirmed non-UI at analyze stage) — criterion satisfied for the two markup-bearing login routes. ✅
2. **`/register/invitation/accept` reuses the same gabarit, role/expiry read-only** — `register/invitation/page.tsx` (the page rendering the form that posts to `/accept`) now uses `AuthColumn`/`AuthFactList` identically to the login pages; role and expiry rendered via `AuthFactValue` (read-only `<dd>`), single accept action via one `AuthSubmitButton`. ✅
3. **RGPD consent preserved inline, no regression** — `AuthConsentField` preserves exact `id`/`name` attributes (`consent-accepted`/`consentAccepted`, `invitation-consent-accepted`/`consentAccepted`); both pre-existing test files (`login/page.test.tsx`, `register/invitation/page.test.tsx`) pass unmodified, confirming no regression. ✅
4. **`design-system.ts` tokens reused, no new color/font** — grepped `apps/app/app/auth-column.tsx` and the 3 rewritten pages: zero hex-literal colors or font-family strings remain outside `paperTokens.*` references (`#1A1A18`, `#6B6860`, `Lora` etc. all removed). ✅
5. **WCAG 2.1 AA** — labels: `htmlFor`/`id` pairs preserved on all inputs (email, both consent checkboxes). Focus: no `outline: none` introduced anywhere in the new/touched files, native focus ring preserved. Contrast: `text`/`canvas` 15.1:1, `textMuted`/`canvas` 4.6:1, `danger` (#C0392B) on `surfaceMuted` (#F2F0EB) computed at ≈4.78:1 — all ≥4.5:1 for text. `AuthErrorBanner` now carries `role="alert"` (closes the designer's advisory). ✅

### Findings
- [ADVISORY] The two consent copy blocks remain intentionally duplicated (different legal text for signup vs. invitation) — correctly left as-is per analyze-stage guidance, not a defect.
- [ADVISORY] `register/invitation/page.tsx` carries a pre-existing 71.42% branch-coverage line (line 50, the invalid-invitation early return) unrelated to this task's diff — not introduced by this change, no regression.

### Next action
Tech lead to sign off and tick US-074 in sprint 020.
