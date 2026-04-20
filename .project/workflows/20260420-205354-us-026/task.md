# US-026 — Permettre l'édition WYSIWYG Puck côté user + lecture mobile

## Workflow
analyze-design-dev-review

## Acceptance Criteria
- L'utilisateur peut éditer son CV dans Puck
- Un mode lecture seule mobile existe
- Les modifications restent compatibles avec l'export PDF

## Scope
Expose the stored `cvContent` for a candidate application in an editable document surface, keep the same document schema for downstream PDF export, and provide a mobile read-only fallback.

