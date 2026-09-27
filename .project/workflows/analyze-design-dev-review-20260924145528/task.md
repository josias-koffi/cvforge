---
tags: [run/analyze-design-dev-review-20260924145528, workflow/analyze-design-dev-review, sprint/029]
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
sprint_task: "[[sprints/sprint-029#^us-132]]"
---
# US-132 — Rate limit générique par route publique

Source : [[sprints/sprint-029]] · epic E23 · [[decisions/ADR-022-public-ai-surface-rate-limiting]].
Prérequis livré : US-131 ([[workflows/runs/analyze-design-dev-review-20260924143552]]).

Critères : middleware et config paramétrés par route (clé de budget global, limites) ; une route s'ajoute par
configuration ; ATS inchangé (variables `ATS_*`, tests actuels) ; timers simulés, ADR-022 amendée si le contrat
change ; `POST /public/events` sous rate limit avec ses propres limites ; le proxy de production réécrit
`X-Forwarded-For` (revue US-131).

## Available Repositories (1)
- monorepo [node] cvforge at /home/devops/perso/projets/cvforge — apps/api (NestJS), apps/web, apps/landing, packages/*
