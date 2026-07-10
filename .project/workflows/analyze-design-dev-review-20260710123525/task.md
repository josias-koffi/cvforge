---
tags: [workflow/run, workflow/analyze-design-dev-review]
parent: "[[../../../agent-setup/workflows/analyze-design-dev-review|analyze-design-dev-review]]"
sprint: "[[../../sprints/sprint-020#US-076]]"
---
# Task: US-076 — Refondre `/notifications` en liste dense groupée par jour

## Sprint context
- Sprint: [[../../sprints/sprint-020|sprint-020]]
- Task ID: US-076
- Workflow: analyze-design-dev-review
- Run ID: analyze-design-dev-review-20260710123525

## Acceptance criteria
- [ ] Liste triée par date décroissante, non-lu en tête avec pastille visible
- [ ] Groupement visuel par jour (aujourd'hui / hier / plus ancien)
- [ ] Carte "Préférences email" (US-041, déjà livrée) repositionnée en pied de liste, format dense
- [ ] Lien direct vers la candidature liée conservé
- [ ] WCAG 2.1 AA : `aria-live` sur le compteur non-lu, focus visible

## Source
- `.project/designs/frontend-rationalization-20260709.md` §8
- Vision §14

## Current state (pre-implementation notes)
- `apps/app/app/notifications/page.tsx` (319L): fetches notifications + preferences server-side, renders "Compte" + "Rappels actifs" KPI cards, then "Préférences email" card, then "Fil d'activité" card listing all notifications flat (no unread-first sort, no day grouping).
- `apps/app/app/notifications/notification-bell.tsx`: shell header accessory, unrelated to this page's list rendering.
- Routes: `read/route.ts` (mark-as-read), `preferences/route.ts` (POST preferences), `summary/route.ts` — untouched by this task unless AC requires it.
- No existing "unread pinned to top" or day-bucket grouping logic exists yet.

## Available Repositories
- (single-repo project; no `state.json.repos` entries)
