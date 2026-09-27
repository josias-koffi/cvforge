---
tags: [run/analyze-design-dev-review-20260924143552, workflow/analyze-design-dev-review, sprint/029]
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
sprint_task: "[[sprints/sprint-029#^us-131]]"
---
# US-131 — Événements de tunnel côté API

Source : [[sprints/sprint-029]] · epic E23 (hors vision, décision produit du 2026-09-24) · [[decisions/ADR-022-public-ai-surface-rate-limiting]].
Workflow : `analyze-design-dev-review`, choisi par le propriétaire le 2026-09-24.

Critères : table `acquisition_events` (outil, étape, locale, `ip_hash`, date ; ni IP brute, ni email, ni texte libre) ;
`POST /public/events` rate-limitée (US-132) via une route BFF de la landing ; étapes `view`, `result`, `cta_click`,
`email_submitted`, activation lue par jointure sur l'email comme `readAtsCounters` ; tunnel par outil dans
`/admin/metrics`, ATS inclus.

## Available Repositories (1)
- monorepo [node] cvforge at /home/devops/perso/projets/cvforge — apps/api (NestJS), apps/web (app), apps/landing (landing), packages/*
