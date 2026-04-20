# Task Context — US-018

- Sprint: `005`
- Task: `US-018`
- Title: `Creer une candidature a partir d'une offre via scraping`
- Workflow: `analyze-design-dev-review`
- Run ID: `20260420-135201-us-018`
- Source: `.project/sprints/sprint-005.md`

## Acceptance Criteria

- Une offre peut etre ingeree depuis une URL
- Les champs utiles a la candidature sont extraits
- Les erreurs d'extraction sont gerees proprement

## Vision Scope

- Vision `§7.3` requires an offer URL, server-side scraping, and a fallback when extraction fails.
- Sprint `005` only asks for URL ingestion via scraping, not the later text or PDF fallback from `US-019`.
- Vision `§7.4` implies the created candidature should at least expose the core offer and company context as a draft record.

## Current Codebase Constraints

- No candidature domain exists yet in `apps/api` or `apps/app`.
- `apps/api/src/ai/openrouter.module.ts` exposes `OPENROUTER_SERVICE` for compliant extraction.
- Auth sessions already exist and can scope draft candidatures per user via the session cookie.
