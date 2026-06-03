---
tags: [run/analyze-design-dev-review-20260603130216, workflow/analyze-design-dev-review]
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
---
# Task

Ad hoc request: "il faut pouvoir modifier le suivis de notre candidature dans la vue de notre candidature pour un mailleur suivis"

## Interpreted Scope

Allow users to update a candidature's follow-up status directly from the candidature detail view, so tracking can be maintained without returning to the candidatures list.

## Acceptance Criteria

- The candidature detail header exposes a labelled status control with only valid next statuses for the current candidature.
- Submitting a status change reuses the existing backend status endpoint and returns to the same candidature detail page.
- The page can show success or error feedback after the redirect.
- Status history remains visible and reflects persisted backend status changes after refresh.

## Available Repositories (1)

- app [Next.js + NestJS + PostgreSQL + Redis + Docker + Turborepo + pnpm workspaces] cvforge at /home/devops/perso/projets/cvforge — Main monorepo.
