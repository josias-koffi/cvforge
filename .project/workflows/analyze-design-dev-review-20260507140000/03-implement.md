# Stage 3 — Implement (Developer)
Date: 2026-05-07

## Status: PASS ✅

## Changes made

### New files
- `apps/app/app/candidatures/candidatures-table.tsx` — `"use client"` main table with filters (statut checkboxes, date range, text search), column sort with `aria-sort`, pagination (PAGE_SIZE=20), slide-over trigger, and "Nouvelle candidature" CTA
- `apps/app/app/candidatures/candidatures-slide-over.tsx` — `"use client"` slide-over detail panel: `role="dialog"`, `aria-modal`, ESC/backdrop close, full candidature info, status transitions, profile selector, CV/LM generate buttons, detail link
- `apps/app/app/candidatures/nouvelle-candidature-modal.tsx` — `"use client"` modal with URL import form + text fallback form, ESC close, `role="dialog"` `aria-modal`
- `apps/app/app/candidatures/candidatures-table.test.tsx` — 11 tests
- `apps/app/app/candidatures/candidatures-slide-over.test.tsx` — 10 tests
- `apps/app/app/candidatures/nouvelle-candidature-modal.test.tsx` — 6 tests

### Updated files
- `apps/app/app/candidatures/page.tsx` — now a lean server component: fetches data, renders KPI cards, flash banners (error/success from search params), and `<CandidaturesTable>` client component
- `apps/app/app/candidatures/page.test.tsx` — updated 4 tests to match new page structure (banners still server-rendered; table content in client component)

## Gates
- `pnpm lint`: ✅ 0 errors
- `pnpm test`: ✅ 233 passed (73 files)
- `pnpm --filter @cvforge/app build`: ✅ clean Next.js build
- Coverage: new code covered by 27 new tests (3 new test files)

## Acceptance criteria verification
| AC | Status |
|----|--------|
| Table columns: Poste, Entreprise, Statut (badge), Date, Score entretien, Actions | ✅ `candidatures-table.tsx` |
| Filter bar: statut checkboxes, date range (De/À), text search | ✅ filter bar in `candidatures-table.tsx` |
| Column sort `<th scope="col" aria-sort>` | ✅ all 5 data columns with aria-sort="ascending\|descending\|none" |
| Row click → slide-over | ✅ `CandidaturesSlideOver` in `candidatures-table.tsx` |
| CTA "Nouvelle candidature" haut droite | ✅ Button above table, opens `NouvelleCondidatureModal` |
| Pagination ≥ 20/page | ✅ PAGE_SIZE=20, Précédent/Suivant + "Page X / N" |
