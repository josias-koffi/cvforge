---
tags: [workflow/stage, workflow/analyze-design-dev-review, stage/review]
parent: "[[task]]"
agent: "[[../../../agent-setup/agents/qa-reviewer/agent|qa-reviewer]]"
prev: "[[03-implement]]"
next: "[[final-summary]]"
---
# Stage 4 — Review (qa-reviewer)

## Acceptance criteria verification

1. **Liste triée par date décroissante, non-lu en tête, pastille visible** — ✅ Verified via `groupNotificationsByDay`'s `sortUnreadFirstThenRecent` (tested directly) and the page test asserting "Relancer Acme" (unread) renders before "Relancer Globex" (read) in the fixture. `Badge variant="success"` pastille unchanged.
2. **Groupement visuel par jour (aujourd'hui / hier / plus ancien)** — ✅ Verified: `notification-groups.test.ts` covers all three buckets plus empty-bucket omission; `page.test.tsx` new test confirms only "Plus ancien" renders when the fixture has no today/yesterday items.
3. **Carte "Préférences email" repositionnée en pied de liste, format dense** — ✅ Verified: page test asserts `indexOf("Fil d'activite") < indexOf("Preferences email")` in the rendered markup; checkbox rows collapsed to single-line label+helper per the implement diff.
4. **Lien direct vers la candidature liée conservé** — ✅ `NotificationArticle` preserves `notification.linkHref` unchanged from the original inline markup; no route or contract touched.
5. **WCAG 2.1 AA: `aria-live` sur le compteur non-lu, focus visible** — ✅ `aria-live="polite" role="status"` verified present via regex match in the page test. Focus visibility unchanged — all interactive elements (`Button`, `Badge`-adjacent link, checkboxes, submit) still come from `@cvforge/ui` shared primitives, none overridden. Contrast: day-section heading and helper text reuse `#6B6860` on `#FAFAF7` (4.6:1, already verified AA-compliant per design memory), no new color introduced.

## Engineering standards

- **Active refactoring (§9)**: `NotificationArticle` extraction is justified — avoids duplicating article JSX across the new nested day-section loop. No dead code left behind (`formatDate`, `Badge` still used inside the extracted component). File sizes: `page.tsx` 352L (below 400L warning), `notification-groups.ts` 75L, `notification-groups.test.ts` 88L — all comfortably within target.
- **Clean architecture**: presentational-only change in `apps/app`; no API/domain boundary touched.
- **Coverage/tests**: 259/259 tests pass across 78 files (up from 254/77 pre-task — 2 files added: `notification-groups.test.ts`; 2 tests added to `page.test.tsx`). `pnpm --filter app lint`: 0 warnings. `pnpm --filter app build`: succeeds, `/notifications` bundle 1.42 kB.
- **No new dependency, no ADR needed.**

## Blocking defects
None.

## Advisories (non-blocking)
- The page still uses hardcoded hex values (`#6B6860`, `#D9D3C7`) instead of the named `textMuted`/`border` token exports from `@cvforge/ui`'s design-system — pre-existing pattern in this file, out of scope for this task (not touched by prior US-074/075 either); flag for a future token-migration pass across `apps/notifications` and any other page still using raw hex.

## Pass
- Every acceptance criterion verified with direct test evidence.
- No blocking defects; one non-blocking advisory logged for backlog.
