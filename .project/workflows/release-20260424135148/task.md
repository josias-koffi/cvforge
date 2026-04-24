# Sprint 012 — US-042

## Task

Exposer les graphiques avances du dashboard.

## Acceptance Criteria

- L'evolution des candidatures, les statuts, la progression ATS et les scores post-interview sont visibles
- Les graphiques utilisent les donnees reelles
- Les indicateurs restent lisibles sur mobile et desktop

## Scope Frozen

- `apps/app/app/dashboard/page.tsx`
- `apps/app/app/dashboard/page.test.tsx`
- `apps/app/app/dashboard/analytics.ts`
- `apps/app/app/dashboard/analytics.test.ts`
- `apps/app/app/dashboard/charts.tsx`

## Evidence

- Dashboard now renders an `Analytics avancees` section with a monthly trend chart, status donut, ATS progression chart, and post-interview score chart.
- The charts are fed from authenticated product data already returned by `/applications`, `/applications/summary`, and `/credits/me`.
- ATS progression is derived from persisted CV versions against each application's stored offer metadata; post-interview data is shown when reports exist and otherwise falls back to an explicit empty-state message.
- The layout stays readable on mobile and desktop through auto-fit grids, compact legends, and text summaries alongside each SVG chart.
- Verification completed with `pnpm lint`, `pnpm test -- --coverage`, `pnpm build`, and `pnpm audit --audit-level high`.
