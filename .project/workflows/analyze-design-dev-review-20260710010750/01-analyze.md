<!-- generated-by: sprint (analyze-design-dev-review-20260710010750) -->
---
tags: [workflow/stage, workflow/analyze-design-dev-review, agent/product-owner]
sprint: "[[sprints/sprint-020#US-075]]"
workflow: "[[workflows/definitions/analyze-design-dev-review]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260710010750/task]]"
next: "[[workflows/runs/analyze-design-dev-review-20260710010750/02-design]]"
agent: "[[agents/product-owner/agent]]"
---

# Stage 1 — Analyze (product-owner)

## Scope
`apps/app/app/dashboard/page.tsx` (672L) rewritten as a thin composition of three
new components: `kpi-row.tsx` (3 KPIs), `recent-tables.tsx` (2 read-only tables),
`quick-actions.tsx` (3 action links). All existing data-fetch calls
(`fetchApplicationsSummary`, `fetchApplications`, `fetchCreditsSummary`) and the
billing-return banner stay in `page.tsx`.

Vision §12.2–12.4 lists a broader KPI/chart set than the AC. Sprint 020's design
doc explicitly narrows this ("reprend exactement US-070"), and the user confirmed
(2026-07-10) dropping the 4 charts, LinkedIn share card, inline credit purchase
form, and base-profile summary block rather than relocating them — consistent with
the sprint's own directive to "keep only what we actually use, add back later."
This is a deliberate, user-approved scope narrowing of vision §12.3/§12.5 for this
screen only; not an unapproved feature removal.

## Acceptance criteria — testability
All 6 AC are objectively verifiable: file split + line counts, KPI labels present,
table row/column content, quick-action links, and CSS grid breakpoints (mobile
stacked / tablet 2-col / desktop 3-col).

## Product questions
None outstanding — scope decision made explicit above.

## Verdict: PASS — scope is clear, proceed to design.
