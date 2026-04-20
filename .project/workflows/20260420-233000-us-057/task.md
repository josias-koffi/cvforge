# Task: US-057

**Sprint**: 008
**Workflow**: analyze-design-dev-review
**Run ID**: 20260420-233000-us-057

## Title
Remplacer l'éditeur de CV utilisateur par Puck Editor en mode contenu uniquement

## Acceptance Criteria
- Le formulaire shadcn/ui est remplacé par `<Puck>` avec `permissions: { delete: false, drag: false, duplicate: false, insert: false }`
- Le contenu généré par l'IA est chargé dans Puck comme `Data` initial
- Les modifications sont sauvegardées via `PUT /applications/:id/cv`
- La lecture mobile utilise `<Render>` de Puck (SSR-safe, pas d'import dynamique nécessaire)
- L'export PDF via Puppeteer reste compatible avec le rendu `<Render>`

## Source
ADR-003, vision §6, §8, §16
