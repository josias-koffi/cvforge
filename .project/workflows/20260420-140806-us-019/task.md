# Task Context — US-019

- Sprint: `005`
- Task: `US-019`
- Title: `Ajouter le fallback texte et le fallback PDF si faisable dans le MVP`
- Workflow: `analyze-design-dev-review`
- Run ID: `20260420-140806-us-019`
- Source: `.project/sprints/sprint-005.md`

## Acceptance Criteria

- Le fallback texte est disponible
- La faisabilite du fallback PDF MVP est statutee
- Si le fallback PDF est trop couteux, le report est documente sans casser le MVP

## Vision Scope

- Vision `§7.3` defines the offer-detail step with URL scraping first, then a text fallback, and a PDF fallback only if it is feasible in the MVP.
- Vision `§16` includes `Creation de candidature (scraping + fallback texte)` in the MVP checklist, while `Import PDF d'offre` is listed later and not required to unblock MVP value.
- Vision `§2.2` mentions a future PDF-to-image backend path for multimodal AI, but no ingestion/storage pipeline exists yet in the current codebase.

## Current Codebase Constraints

- `apps/api/src/applications/` already owns authenticated candidature ingestion, extraction, and file-backed draft persistence.
- The app already has a protected `/candidatures` page and a single route handler that forwards URL imports to the API.
- There is no existing PDF upload endpoint, no file-storage path for incoming offer documents, and no OCR or PDF parsing boundary in the candidature module.
