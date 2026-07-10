<!-- generated-by: sprint (analyze-design-dev-review-20260710010750) -->
---
tags: [workflow/run, workflow/analyze-design-dev-review]
sprint: "[[sprints/sprint-020#US-075]]"
workflow: "[[workflows/definitions/analyze-design-dev-review]]"
---

# Task: US-075 — Refondre le Dashboard : 3 KPI + 2 tables + quick actions

## Acceptance criteria
- [ ] `dashboard/page.tsx` (672 lignes) scindé en `kpi-row.tsx`, `recent-tables.tsx`, `quick-actions.tsx` (chacun <300 lignes)
- [ ] 3 KPI cards en ligne : candidatures actives, crédits restants, prochaine interview
- [ ] Table "Candidatures récentes" (5 dernières : Poste, Statut, Date)
- [ ] Table "Sessions entretien récentes" (5 dernières : Candidature, Score, Date)
- [ ] Quick actions : "Nouvelle candidature", "Commencer un entretien", "Acheter des crédits"
- [ ] Responsive : stacked mobile, 2-col tablet, 3-col desktop

Source: `.project/designs/frontend-rationalization-20260709.md` §2, vision `§12.1`–`§12.4`. Absorbe US-070 (sprint 018, non exécutée).

## User scope decision (2026-07-10)
Confirmed with the user: strip the dashboard to exactly the AC scope. The current
`dashboard/page.tsx` also ships 4 analytics charts, a LinkedIn share card, an inline
credit-pack purchase form, and a "base profile" summary block — none in the AC or in
the design doc (which says the dashboard "reprend exactement US-070"). User selected:
delete the charts (`analytics.ts`, `charts.tsx`), the share card (`share-card.tsx`),
the inline purchase form, and the profile summary block, plus their now-orphaned
tests. `/share/dashboard` route stays untouched but loses its dashboard entry point.
