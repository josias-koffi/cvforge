# Task: US-024 — Prévisualiser les templates avec données fictives injectées

**Sprint:** 006
**Run ID:** 20260420-163000-us-024
**Workflow:** analyze-design-dev-review
**Agent:** designer
**Source:** vision §13.3, §16

## Acceptance Criteria

- [ ] Une prévisualisation live existe
- [ ] Les données fictives couvrent les cas principaux
- [ ] Le rendu respecte le design "Papier & Crayon"

## Context (from exploration)

### What already exists:
- `TemplatePreview` component in `apps/app/app/admin/templates/page.tsx` renders blocks by merging `definition.defaultProps + block.props`
- `documentBlockRegistry` in `packages/ui/src/document-blocks.tsx` exposes all CV/LM blocks with basic defaultProps
- `CVDocumentContent` and `LetterDocumentContent` types in `packages/types/src/index.ts` define the full normalized content schema
- Seed templates in `templates.store.ts` use single-item data (1 experience, 1 education, etc.)

### What's missing:
1. **No rich fixture data** — only 1 experience, no certifications, no languages, no projects in existing data
2. **No content injection mechanism** — TemplatePreview cannot receive a full CVDocumentContent to override block rendering
3. **No array expansion** — multiple experiences/education items need repeated block renders

### Key types:
- `CVDocumentContent`: candidate, experiences[], education[], skills.hard[], skills.soft[], certifications[], languages[], projects[]
- `LetterDocumentContent`: candidate, company, date, object, body{p1,p2,p3}, signature

### File paths:
- `packages/ui/src/document-blocks.tsx` — block registry and components
- `packages/types/src/index.ts` — type definitions
- `apps/app/app/admin/templates/page.tsx` — admin page with TemplatePreview
