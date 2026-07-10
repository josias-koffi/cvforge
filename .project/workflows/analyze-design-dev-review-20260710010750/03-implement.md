<!-- generated-by: sprint (analyze-design-dev-review-20260710010750) -->
---
tags: [workflow/stage, workflow/analyze-design-dev-review, agent/developer]
sprint: "[[sprints/sprint-020#US-075]]"
workflow: "[[workflows/definitions/analyze-design-dev-review]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260710010750/02-design]]"
next: "[[workflows/runs/analyze-design-dev-review-20260710010750/04-review]]"
agent: "[[agents/developer/agent]]"
---

# Stage 3 — Implement (developer)

## Changes
- `apps/app/app/dashboard/page.tsx`: 672L → 168L. Kept data-fetch (`fetchApplicationsSummary`,
  `fetchApplications`, `fetchCreditsSummary`) and the billing-return banner; delegates rendering
  to three new components.
- **New** `kpi-row.tsx` (86L): candidatures actives, crédits restants, prochaine interview
  (derived from the most recent `interview_scheduled` status-history entry — no scheduled-date
  field exists in the data model, so this surfaces the most relevant pending interview instead).
- **New** `recent-tables.tsx` (187L): "Candidatures récentes" (5 latest by `updatedAt`) and
  "Sessions entretien récentes" (5 latest interview reports, flattened across applications,
  sorted by `createdAt`) — static tables reusing `candidatures-table.tsx`'s visual grammar
  (border/pill/typography), no client-side sort/filter (not required by AC).
- **New** `quick-actions.tsx` (56L): 3 link-cards → `/candidatures`, `/interview`, `/credits`.
- **Deleted** (user-approved scope narrowing, see `01-analyze.md`): `analytics.ts`,
  `analytics.test.ts`, `charts.tsx`, `share-card.tsx` — all four analytics charts, and the
  LinkedIn share card, are gone from the dashboard. `share-card-content.ts` is untouched
  (still used by `/share/dashboard/page.tsx` and `/share/dashboard/og/route.tsx`); two of its
  exports (`buildDashboardSharePageUrl`, `buildLinkedInShareUrl`) are now unreferenced outside
  their own test — left as-is per the untouched-file rule, flagged in the sprint backlog.
- Inline credit-pack purchase form and "base profile" summary block removed from the page (no
  longer reachable from the dashboard; both remain fully available on `/credits` and `/profile`).
- `page.test.tsx` rewritten to assert the new KPI/table/quick-actions content instead of the
  removed charts/share-card/purchase-form/profile-panel markup.

## Responsive grid
All three new sections reuse `repeat(auto-fit, minmax(Npx, 1fr))` CSS grid — already the
established pattern on this page and on `/candidatures` — which naturally stacks on mobile and
grows to 2/3 columns on wider viewports without extra breakpoints.

## Quality gates
- `pnpm --filter app lint` — 0 warnings/errors.
- `pnpm --filter app test` — 77/77 files, 254/254 tests pass (dashboard suite: 2/2).
- `pnpm --filter app build` — succeeds; `/dashboard` route JS dropped from a chart-heavy bundle
  to 1.44 kB (charts/share-card code fully removed from the client bundle).
- `tsc --noEmit`: no new errors introduced (`dashboard/page.test.tsx` calling `DashboardPage()`
  with no args triggers the same pre-existing `TS2554` pattern already present on
  `admin/page.test.tsx` and `notifications/page.test.tsx` — not a regression).

## Active refactoring (spec §9)
All 4 touched/new TSX files are under the 300-line target (168 / 86 / 187 / 56 lines). No
duplication introduced — table markup constants (`TABLE_STYLE`, `HEADER_CELL_STYLE`, etc.) are
shared between the two tables in `recent-tables.tsx` instead of repeated.

## Backlog items raised
- Dead-export cleanup: `share-card-content.ts` — `buildDashboardSharePageUrl`/`buildLinkedInShareUrl`
  now unused outside their test; revisit when `/share/*` is replanned.
- `/share/dashboard` route has no remaining entry point in the app; decide whether to restore one
  or deprecate the route when `/share/*` is replanned (per the 2026-07-09 analyst audit).
