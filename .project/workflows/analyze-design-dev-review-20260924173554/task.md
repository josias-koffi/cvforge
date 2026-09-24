---
tags: [run/analyze-design-dev-review-20260924173554, workflow/analyze-design-dev-review, sprint/029, task/US-136]
sprint: "[[sprints/sprint-029#US-136]]"
workflow: "[[workflows/analyze-design-dev-review]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924173554/01-analyze]]"
---
# US-136 — Comparateur CV ↔ offre
Sprint 029, epic E23 (hors vision, décision produit du 2026-09-24). Story L, découpage obligatoire : API d'abord, page ensuite.

Critères :
- `POST /public/keyword-match` : CV PDF/DOCX + texte d'offre ; réutilise `extractCvText` sans OCR et `packages/ats-score`.
- 0 appel LLM, prouvé par test ; CV jamais persisté.
- Résultat : taux de couverture, mots-clés présents et manquants.
- CTA « Générer un CV adapté à cette offre » → service lead (US-133) ; après inscription, la candidature existe avec le texte de l'offre, sans crédit consommé.
- À trancher au design : page dédiée ou onglet de la page ATS.
Critères communs E23 (backlog) : FR/EN, événements US-131, WCAG AA, sitemap, `pageMetadata()`.

## Available Repositories (1)
- monorepo [node] cvforge at . — apps/api (NestJS), apps/landing (Next 16), packages/ats-score, packages/types
