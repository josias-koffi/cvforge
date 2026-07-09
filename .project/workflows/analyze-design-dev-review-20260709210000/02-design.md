<!-- generated-by: sprint 020 US-074 · stage 02 (designer) -->
---
tags: [workflow/stage, stage/design]
parent: "[[workflows/runs/analyze-design-dev-review-20260709210000/task]]"
agent: "[[agents/designer/agent]]"
---
# Stage 2 — Design (designer)

## Design Thinking
1. **Purpose** — A candidate (vision §3.1 passwordless persona) requesting a magic link, or an invited admin/user (§3.2) accepting an invitation, both on desktop. The current forms stretch full-viewport-width markup unchanged from mobile, which reads as unfinished on a large screen.
2. **Tone** — `brutally minimal` (unchanged, already the project direction per `frontend-rationalization-20260709.md`).
3. **Differentiator** — A single narrow, centered "feuille" column that never grows past 420px regardless of viewport, so the eye has one fixed anchor point instead of scanning a wide half-empty page.
4. **Anti-convergence check** — No Inter/Roboto (stays DM Sans body / EB Garamond document per existing tokens), no shadcn generic gray (`#fafafa`/`#e5e7eb` rejected, already rejected repo-wide), no split-screen marketing panel (explicitly ruled out by the source design doc §1), no card-in-a-card.

## Mockup
Shared structure for `/login`, `/login/check-email`, `/register/invitation`:
- Outer wrapper: `display: grid`, `justify-content: center`, full viewport height, `background: paperTokens.color.canvas`.
- Inner column: `max-width: 420px`, `width: 100%`, `padding: paperTokens.spacing.3xl paperTokens.spacing.xl`.
- No card border/shadow around the form itself — the canvas background is the "paper"; only the CTA button gets `paperTokens.shadow.line`.
- Vertical stack: heading (display font, `paperTokens.typography.display`), one-line explanatory copy (`textMuted`), form fields, consent checkbox block, submit button.
- `/register/invitation` (accept) reuses the identical column width and vertical rhythm; role/expiry rendered as a `<dl>` in `textMuted` above the single accept action.
- `/login/success` stays a server redirect — no markup change (confirmed non-UI in analyze stage).

## Journey
1. `/login` → user enters email + ticks consent → submit → `/login/check-email` (same column width, confirms email/expiry).
2. Invited user opens `/register/invitation?token=...` → sees role/expiry (read-only) + consent → accepts → session → redirect to `/dashboard`.
3. Any validation error re-renders the same narrow column with an inline error banner — never widens.

## Typography
`paperTokens.typography.display` for the `<h1>`, `paperTokens.typography.body` (DM Sans) for copy/labels/buttons — both already declared in `design-system.ts`, no new font introduced (criterion 4).

## Color
`paperTokens.color.canvas` (#FAFAF7) background, `text` (#1A1A18, 15.1:1) for primary copy, `textMuted` (#6B6860, 4.6:1) for secondary copy — both already verified AA in the source design doc. `danger` (#C0392B) for the error banner, checked against canvas: passes AA for text ≥14px bold or use as a left-border accent rather than text color if margin is tight.

## Motion
None beyond existing focus/hover transitions (≤150ms per repo convention) — no entrance animation, consistent with the "no decorative motion" project rule.

## Interaction notes
- All inputs keep native `<label htmlFor>` associations already present in the pages — verify the label wiring survives the token swap.
- Focus ring: reuse the existing shared focus style token (visible outline, not just color change).
- Tab order: heading → copy → field(s) → consent checkbox → submit — unchanged from current DOM order, only layout width changes.
- Error banner uses `role="alert"` if not already present — advisory check for developer.

## Developer brief
- Do not create a new `AuthLayout` package/component unless it demonstrably removes duplication without exceeding scope — a small local `auth-column.tsx` wrapper shared by the three touched pages (`login/page.tsx`, `login/check-email/page.tsx`, `register/invitation/page.tsx`) is the right size (§9 active refactoring: these files are already touched and duplicate the same inline wrapper).
- Replace all hardcoded colors/fonts in the three pages with `paperTokens` imports from `packages/ui/src/design-system.ts` (criterion 4).
- Keep `maxWidth: 420px` fixed — do not scale up at `lg`/`xl` breakpoints (this is the intentional differentiator, not a bug).
- Do not touch `/login/success` (no markup) or the two `route.ts` handlers (no UI).
- Preserve existing consent checkbox `id`/`name` attributes (`consent-accepted`, `invitation-consent-accepted`) so existing tests keep passing; only restyle, do not rename.
- If extracting a shared consent block, do so only if it stays inside these three files' scope and does not balloon the diff — otherwise leave the two consent blocks duplicated as advisory debt (per analyze stage finding).

### Verdict: PASS
### Summary (≤ 100 words)
Narrow 420px centered column, no card chrome, existing Papier & Crayon tokens replace hardcoded auth-page styles, zero new fonts/colors, zero layout system change. WCAG AA carried over from already-verified token contrast ratios.
### Findings
- [ADVISORY] Verify `role="alert"` on error banners during implementation — not currently confirmed present.
### Next action
Hand off to developer for implementation across the three touched pages.
