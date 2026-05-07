# Stage 1 — Analyze (Product Owner)
Date: 2026-05-07

## Scope verdict: CLEAR ✅

US-061 converts the candidatures list from an expanded card-per-row layout into a sortable, filterable, paginated table with a slide-over detail panel. Pure UI refactor of `apps/app/app/candidatures/page.tsx` — no new API endpoints required.

## Acceptance criteria — testable ✅

| AC | Testable? | Notes |
|----|-----------|-------|
| Table columns (6) | ✅ | Score = last `interviewReports[last].overallScore` or "—" |
| Filter bar (statut + date + texte) | ✅ | Client-side on fetched data |
| Column sort `aria-sort` | ✅ | WCAG 2.1 AA |
| Row click → slide-over | ✅ | Confirmed by sprint note |
| CTA "Nouvelle candidature" haut droite | ✅ | Wraps existing import forms |
| Pagination ≥ 20/page | ✅ | Default page size = 20 |

## Scope boundaries
- IN: Table, filters, sort, pagination, slide-over, "Nouvelle candidature" CTA wrapping import forms
- OUT: New API endpoints, `/candidatures/[id]` route (US-062), CV/LM generation in table view

## No missing product questions — pass to design.
