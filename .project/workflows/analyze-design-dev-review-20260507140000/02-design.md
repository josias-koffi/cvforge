# Stage 2 — Design (Designer)
Date: 2026-05-07

## UX Decision: pass ✅

## Architecture
- **Server layer** (`page.tsx`): fetches `DraftApplication[]` + `summary`, passes as props.
- **Client layer** (`candidatures-table.tsx`): all interactive state (filters, sort, pagination, slide-over).
- No new library — slide-over uses CSS positioning inline, consistent with "Papier & Crayon".

## File structure
```
apps/app/app/candidatures/
├── page.tsx                         (Server Component — data only)
├── candidatures-table.tsx           "use client" — table + filters + pagination
├── candidatures-slide-over.tsx      "use client" — detail panel
├── nouvelle-candidature-modal.tsx   "use client" — import forms
├── status-metadata.ts               (unchanged)
└── page.test.tsx                    (updated)
```

## Table columns
| # | Header | Source | Sortable |
|---|--------|--------|----------|
| 1 | Poste | `extracted.title` | ✅ |
| 2 | Entreprise | `extracted.companyName` | ✅ |
| 3 | Statut | badge with `getApplicationStatusTone` | ✅ |
| 4 | Date | `createdAt` fr-FR medium | ✅ |
| 5 | Score entretien | last `interviewReports[last].overallScore` | ✅ |
| 6 | Actions | "Voir" button → slide-over | ✗ |

## Filter bar (above table, flex row)
- Statut: `<select multiple>` or checkbox group
- Date range: `<input type="date">` De / À (filters on `createdAt`)
- Texte: `<input type="search">` (matches Poste + Entreprise)

## Pagination
- 20 rows/page default; Précédent / Suivant buttons + "Page X / N"

## Slide-over
- 420px wide on ≥1024px, full-width on mobile
- Fixed right panel, backdrop click closes
- Contains: title, company, status badge, date, score, transitions, CV/LM links
- `role="dialog"` `aria-modal="true"` `aria-label="Détail de la candidature"`
- ESC key closes

## WCAG 2.1 AA
- `<table>` with `<caption>`, `<thead>`, `<th scope="col">`, `aria-sort`
- All filter inputs have `<label>`
- Slide-over dialog has role/aria-modal/aria-label
- Close button `aria-label="Fermer le détail"`
- Focus returns to trigger row after close
