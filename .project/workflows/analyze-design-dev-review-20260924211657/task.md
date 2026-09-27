---
tags: [run/analyze-design-dev-review-20260924211657, workflow/analyze-design-dev-review, sprint/030, task/US-137]
sprint: "[[sprints/sprint-030#US-137]]"
workflow: "[[workflows/analyze-design-dev-review]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924211657/01-analyze]]"
---
# US-137 — « Ce métier recrute-t-il près de chez moi ? »
Sprint 030, epic E23 (hors vision, décision produit du 2026-09-24). Story L, découpage obligatoire : l'API d'abord, la page ensuite.
Workflow : aucune ligne `Workflow:` dans le sprint. On prend celui du projet, `analyze-design-dev-review`, utilisé par toutes les stories E23.

Critères :
- Autocomplétion ROME publique, lue dans la copie locale (`rome-appellations.pg-reader.ts`).
- Pour un métier et un département :
  - tension de 1 à 5 ;
  - volume d'offres ;
  - demandeurs d'emploi (`market-stats.service.ts`) ;
  - salaire médian, avec la taille de l'échantillon.
- Aucun appel France Travail pendant la requête ; la source France Travail est citée (ADR-024).
- Salaire masqué sous une taille d'échantillon minimale, avec un message explicite.
- CTA « Recevoir chaque matin les offres de ce métier » → service lead. Après l'inscription, le projet de recherche est pré-rempli (ROME + lieu) et le digest E19 part.

Critères communs E23 (backlog) :
- FR/EN ;
- événements US-131 ;
- WCAG AA ;
- sitemap et `pageMetadata()` ;
- rate limit avant la mise en ligne.

## Available Repositories (1)
- monorepo [node] cvforge at . — apps/api (NestJS), apps/landing (Next 16), apps/web, packages/types
