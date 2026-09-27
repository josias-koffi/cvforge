---
tags: [run/analyze-design-dev-review-20260924155415, workflow/analyze-design-dev-review, sprint/029]
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
sprint_task: "[[sprints/sprint-029#^us-133]]"
---
# US-133 — Service « lead » générique

Source : [[sprints/sprint-029]] · epic E23 · [[decisions/ADR-022-public-ai-surface-rate-limiting]].
Prérequis livrés : US-131, US-132.

Critères : extrait de `ats-unlock.service.ts` (email + consentement → magic link, réponse identique qu'un compte
existe ou non) ; intention de pré-remplissage typée (offre, ROME + lieu, SIREN, scan ATS) appliquée à la première
connexion, expirée avec le magic link ; aucun texte de CV dans l'intention ; ATS migré, son scan se retrouve dans l'app.

## Available Repositories (1)
- monorepo [node] cvforge at /home/devops/perso/projets/cvforge — apps/api (NestJS), apps/web, apps/landing, packages/*
