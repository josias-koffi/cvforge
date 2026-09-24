---
tags: [run/analyze-design-dev-review-20260924162332, workflow/analyze-design-dev-review, sprint/029]
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
sprint_task: "[[sprints/sprint-029#^us-134]]"
---
# US-134 — Correctifs du tunnel ATS

Source : [[sprints/sprint-029]] · epic E23. Prérequis livrés : US-131 à US-133.

Critères : la landing envoie `locale` (un scan depuis `/en/…` est stocké en `en`) ; erreurs traduites côté landing
à partir d'un code, plus de message français sur la version EN ; lien vers l'outil depuis le Hero et la section CTA ;
`ats-checker.tsx` (317 lignes) sous 300 et branchement des 4 événements d'US-131 testé.

## Available Repositories (1)
- monorepo [node] cvforge at /home/devops/perso/projets/cvforge — apps/api (NestJS), apps/web, apps/landing, packages/*
