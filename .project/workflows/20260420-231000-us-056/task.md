# Task: US-056 — Admin Puck Editor Integration

Sprint: 008
Run ID: 20260420-231000-us-056
Workflow: analyze-design-dev-review

## Title
Intégrer Puck Editor en mode drag-and-drop dans l'interface admin de templates

## Acceptance Criteria
- [ ] Le textarea JSON est remplacé par un vrai canvas Puck avec la palette de blocs filtrée par `kind`
- [ ] L'admin peut assembler, réordonner et supprimer des blocs par drag-and-drop
- [ ] `onPublish` appelle `PUT /templates/:id` et met à jour le layout en base
- [ ] Le composant `<PuckTemplateEditor>` est chargé via `next/dynamic` avec `ssr: false`
- [ ] La création d'un nouveau template ouvre un canvas vide dans Puck

## Source
ADR-003, vision §6.1, §6.7, §13.3
