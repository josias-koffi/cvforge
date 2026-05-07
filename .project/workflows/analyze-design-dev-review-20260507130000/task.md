# Task: US-061 — Convertir la liste candidatures en table filtrée avec slide-over détail

Sprint: 016
Workflow: analyze-design-dev-review
Run ID: analyze-design-dev-review-20260507130000

## Title
Convertir la liste candidatures en table filtrée avec slide-over détail

## Acceptance Criteria
- [ ] Table avec colonnes: Poste, Entreprise, Statut (badge), Date, Score entretien, Actions
- [ ] Barre de filtres: statut, date range, recherche texte
- [ ] Tri par colonne activé (`<th scope="col" aria-sort>`)
- [ ] Clic sur ligne → slide-over preview (confirmé — UX slide-over préféré)
- [ ] CTA "Nouvelle candidature" en haut à droite
- [ ] Table paginée (≥ 20 lignes par page)

Source: vision §7

## Notes
- Slide-over confirmed preferred over direct navigation to `/candidatures/[id]`
- Existing page: `apps/app/app/candidatures/page.tsx` (Server Component, fetches DraftApplication[])
- Status badge already has color semantics in `status-metadata.ts`
- Interview score available via `application.interviewReports[last].overallScore`
- Table pagination must be client-side (filters + sort + page all interact)
