<!-- generated-by: sprint (analyze-design-dev-review-20260710010750) -->
---
tags: [workflow/stage, workflow/analyze-design-dev-review, agent/designer]
sprint: "[[sprints/sprint-020#US-075]]"
workflow: "[[workflows/definitions/analyze-design-dev-review]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260710010750/01-analyze]]"
next: "[[workflows/runs/analyze-design-dev-review-20260710010750/03-implement]]"
agent: "[[agents/designer/agent]]"
---

# Stage 2 — Design (designer)

## Grammar
Same "bande KPI compacte en haut → contenu dense au centre" grammar already used
on `/candidatures` (US-061/062, delivered). No new tokens: `#1A1A18` text,
`#6B6860` muted, `#D9D4CA`/`#D8D2C8` borders, `1rem` card radius — matches the
existing `candidatures-table.tsx` visual language, kept as-is rather than
migrated to `paperTokens` (untouched-file rule: the rest of the app still uses
these literal hexes, a token migration is a separate cross-cutting task).

## kpi-row.tsx
3 `Card`s in a CSS grid, `repeat(auto-fit, minmax(220px, 1fr))` → 1 col mobile,
naturally 2–3 col as width grows (satisfies stacked/2-col/3-col AC without
breakpoint media queries, consistent with the rest of the dashboard's existing
grid usage).
- **Candidatures actives** = `summary.totalCount - (statusCounts.rejected + statusCounts.offer_received)` — candidatures still in flight.
- **Crédits restants** = `credits.balance`.
- **Prochaine interview** = most recently scheduled application with `status === "interview_scheduled"` (by its `interview_scheduled` statusHistory entry, falling back to `updatedAt`) — shows company/title + date, or "Aucun entretien planifié" muted when none. No calendar/scheduled-date field exists in the data model, so the KPI surfaces the most relevant pending interview rather than a future timestamp we don't have.

## recent-tables.tsx
Two static (non-interactive — no sort/filter/pagination, "5 dernières" only) HTML
tables reusing the `candidatures-table.tsx` markup/style: `<table>` with
`borderCollapse: collapse`, `0.9rem` font, header row `2px solid #D8D2C8`,
row separators `1px solid #EBE7E0`, status pill via `getApplicationStatusTone`.
- **Candidatures récentes**: Poste, Statut, Date — top 5 by `updatedAt`.
- **Sessions entretien récentes**: Candidature, Score (`X/10`), Date — top 5 interview reports across all applications by `createdAt`, flattened and sorted desc.
Both render an empty-state row when there is no data (mirrors the existing pattern).

## quick-actions.tsx
3 link-cards, same `repeat(auto-fit, minmax(220px, 1fr))` grid, same
plain-anchor-card style already in the current page (`Link` styled as a bordered
card): "Nouvelle candidature" → `/candidatures`, "Commencer un entretien" →
`/interview`, "Acheter des crédits" → `/credits`.

## Removed (user-approved, see 01-analyze.md)
Analytics charts (`analytics.ts`, `charts.tsx`), `DashboardShareCard`
(`share-card.tsx`), inline credit-pack purchase form, base-profile summary
block — deleted along with their tests. `/share/dashboard` route/page/OG image
stay untouched; they just lose their dashboard entry point.

## Accessibility
Table headers use `scope="col"`; status pill keeps existing tone/contrast
(already AA-compliant per US-061 review); quick-action cards remain native
`<Link>` elements (keyboard-reachable, visible focus ring inherited from global
focus styles).

## Verdict: PASS — fits AC, no new tokens, no unresolved UX risk.
