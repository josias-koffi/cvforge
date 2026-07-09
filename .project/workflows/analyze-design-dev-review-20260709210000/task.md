<!-- generated-by: sprint 020 US-074 -->
---
tags: [workflow/run, workflow/analyze-design-dev-review]
parent: "[[workflows/definitions/analyze-design-dev-review]]"
sprint: "[[sprints/sprint-020#US-074]]"
---
# Task: US-074 — Refondre Login / Register pour le desktop

## Sprint
sprint-020

## Acceptance criteria
- [ ] `/login/request`, `/login/check-email`, `/login/success` centrés en colonne étroite (max 420px), pas de mise en page mobile étirée sur grand écran
- [ ] `/register/invitation/accept` reprend le même gabarit (rôle/expiration en lecture, action unique)
- [ ] Consentement RGPD (US-016) conservé inline, sans régression
- [ ] Tokens `design-system.ts` réutilisés — aucune nouvelle couleur/police introduite
- [ ] WCAG 2.1 AA : labels associés, focus visible, contraste ≥4.5:1

## Source
`.project/designs/frontend-rationalization-20260709.md` §1, vision `§3`

## Context (from Explore research)
- Routes: `apps/app/app/login/page.tsx` (153L, `/login`), `apps/app/app/login/request/route.ts` (40L), `apps/app/app/login/check-email/page.tsx` (76L), `apps/app/app/login/success/page.tsx` (7L, redirect-only), `apps/app/app/register/invitation/page.tsx` (185L, `/register/invitation`), `apps/app/app/register/invitation/accept/route.ts` (43L).
- No shared `AuthLayout`/`CenteredForm` component exists — each page duplicates an inline `<main>` wrapper (`maxWidth: 32rem`/`36rem`, `margin: 0 auto`, `padding: 3rem 1.5rem`).
- Tokens live in `packages/ui/src/design-system.ts` (`paperTokens`) — auth pages currently hardcode divergent values instead of importing tokens.
- RGPD consent is duplicated inline in `login/page.tsx` (lines 105-126) and `invitation/page.tsx` (lines 141-163), no shared component.
- Existing tests: `login/page.test.tsx`, `login/check-email/page.test.tsx`, `login/success/page.test.tsx`, `login/request/route.test.ts`, `register/invitation/page.test.tsx`, `register/invitation/accept/route.test.ts`.
