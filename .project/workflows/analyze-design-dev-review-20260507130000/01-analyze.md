# Stage 1 — Analyze (Product Owner)

## Scope verdict: CLEAR ✅

## Summary
US-061 converts the existing candidatures list page from an expanded card-per-row layout into a sortable, filterable, paginated table with a slide-over detail panel. This is a pure UI refactor of `apps/app/app/candidatures/page.tsx` — no new API endpoints required for the table itself.

## Acceptance criteria breakdown

| AC | Testable? | Notes |
|----|-----------|-------|
| Table columns: Poste, Entreprise, Statut (badge), Date, Score entretien, Actions | ✅ | Score = latest `interviewReports[last].overallScore` or "—" |
| Filter bar: statut, date range, recherche texte | ✅ | Client-side filter on fetched data |
| Column sort with `aria-sort` | ✅ | WCAG 2.1 AA requirement — accessible table sorting |
| Row click → slide-over preview | ✅ | Confirmed by sprint note: "oui on confirme" |
| CTA "Nouvelle candidature" haut droite | ✅ | Wraps existing import forms in a modal/slide-over trigger |
| Table paginée ≥ 20 lignes/page | ✅ | Default page size = 20 |

## Scope boundaries
- IN: Table, filters, sort, pagination, slide-over detail panel, "Nouvelle candidature" CTA
- OUT: New API endpoints (pagination stays client-side on fetched results), `/candidatures/[id]` route (US-062), CV/LM generation actions (remain in slide-over only)
- Existing import forms (URL + text fallback) move into the "Nouvelle candidature" slide-over/modal

## Risks
1. The slide-over requires a `"use client"` component — the page is currently a pure Server Component. Solution: hoist data fetching to the server, render a client table component that receives `DraftApplication[]` as a prop.
2. Score entretien column: `interviewReports` may be empty → display "—".
3. Date range filter: use `createdAt` as the date axis.

## Missing product questions
_None blocking. All criteria are derivable from existing code and vision §7._
