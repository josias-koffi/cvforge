---
tags: [run/analyze-design-dev-review-20260923233426, workflow/analyze-design-dev-review, sprint/026]
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
sprint_task: "[[sprints/sprint-026#^us-118]]"
---
# US-118 — Le code ROME dans le projet de recherche

Source : [[sprints/sprint-026]] · [[decisions/ADR-024-france-travail-platform-rome]].
Prérequis livrés : US-122 ([[workflows/runs/developer-20260923225823]]), US-123 ([[workflows/runs/developer-20260923232118]]).
Workflow : la tâche n'en déclare aucun ; `analyze-design-dev-review`, standard du projet pour une story avec interface.

Critères : ROMEO à l'enregistrement seulement (targetRoles + titre du CV, 5 meilleures appellations avec score) ;
confirmation ou retrait par puces sur /ma-recherche, autocomplétion locale en repli ; table annexe
`search_project_rome` (migration 0029) sans clé étrangère ; enregistrement qui réussit sans ROMEO ; purge RGPD.
