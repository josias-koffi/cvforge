---
tags: [run/analyze-design-dev-review-20260924222645, workflow/analyze-design-dev-review, sprint/030, task/US-139]
sprint: "[[sprints/sprint-030#US-139]]"
workflow: "[[workflows/analyze-design-dev-review]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924222645/01-analyze]]"
---
# US-139 — « Vérifier un employeur »
Sprint 030, epic E23 (hors vision, décision produit du 2026-09-24). Pas de ligne `Workflow:` dans le sprint : on prend celui du projet, `analyze-design-dev-review`.

Critères :
- Recherche par nom ou SIREN ; fiche : effectif, NAF, Egapro, ESS, société à mission, bilan carbone, page employeur France Travail (`companies/`).
- Fonctionne sans clé API ; sources citées.
- Entreprise inconnue : message clair, pas d'erreur.
- CTA vers les entreprises qui recrutent (E20) → service lead.
- À vérifier : les quotas de recherche-entreprises.api.gouv.fr pour un appel à la demande.

Critères communs E23 (backlog) : sans compte, FR/EN sans texte en dur (test de parité) ; événements US-131 (vue, résultat, clic CTA, email) ; WCAG 2.1 AA, `aria-live`, `prefers-reduced-motion` ; source citée ; `sitemap.ts` et `pageMetadata()` ; rate limit US-132 avant mise en ligne ; pré-remplissage limité au SIREN.

## Available Repositories (1)
- monorepo [node] cvforge at . — apps/api (NestJS), apps/landing (Next 16), packages/types
