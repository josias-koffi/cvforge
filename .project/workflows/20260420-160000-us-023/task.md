# Task: US-023 — Gérer activation, duplication, catégorisation et défaut des templates

**Sprint:** 006
**Run ID:** 20260420-160000-us-023
**Workflow override:** analyze-design-dev-review
**Agent original:** product-owner (overridden to full workflow)
**Source:** vision §6.6, §13.3, §16

## Acceptance Criteria

- [ ] Un template peut être dupliqué
- [ ] Les tags/catégories sont gérés
- [ ] Un template par défaut est définissable par type

## Context (from exploration)

### What already exists (US-021 + US-022):
- `TemplateRecord` has `active: boolean`, `categories: string[]`, `isDefault: boolean`, `kind: TemplateKind`
- API: GET/POST/PUT `/templates` + POST `/templates/:id/duplicate`
- `duplicateTemplate()` creates clone with `active=false, isDefault=false`
- Service enforces one-default-per-kind constraint via `persistWithDefaultConstraints()`
- Frontend admin page at `/admin/templates` with creation/edit form

### What's missing/incomplete for US-023:
1. **Activation toggle**: No quick toggle button in list – user must open edit form
2. **Category picker UX**: Only free-form comma-separated input; no predefined suggestions
3. **Default marker UX**: No visual indicator of which template is default per type in list view
4. **No delete endpoint**: Missing `DELETE /templates/:templateId`
5. **No filtering**: No filter by kind/active/category in admin list

### Vision §6.6 categories:
ATS, Moderne, Minimaliste, Créatif

### Vision §6.7 / §13.3 management actions:
- Activer / désactiver
- Définir template par défaut par type (CV / LM)
- Dupliquer
- Catégoriser (tags: ATS, Moderne, Minimaliste, Créatif)
- Supprimer (avec vérification si utilisé dans des candidatures actives)
