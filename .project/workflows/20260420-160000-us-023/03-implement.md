# Stage 3 — Implement (Developer)
**Run ID:** 20260420-160000-us-023
**Date:** 2026-04-20

## Implementation Verdict: PASS ✅

---

## Changes Delivered

### API — apps/api/src/templates/

**templates.types.ts**
- Added `remove(templateId: string) => void` to `TemplatesStore` interface

**templates.store.ts** (`FileTemplatesStore`)
- Added `remove(templateId)` method: deletes from in-memory map and persists to disk

**templates.service.ts** (`TemplatesService`)
- Added `deleteTemplate(templateId)`:
  - Throws `NotFoundException` if template not found
  - Refuses deletion if the template is the last of its kind (throws `ConflictException` — HTTP 409)
  - Transfers `isDefault=true` to the first sibling of the same kind when deleting a default
  - Then calls `store.remove(templateId)`

**templates.controller.ts** (`TemplatesController`)
- Added `DELETE /templates/:templateId` endpoint with `@HttpCode(204)`
- Admin session guard applied

### Frontend — apps/app/app/admin/templates/

**delete/route.ts** (new)
- `POST` handler receives `templateId`, calls `DELETE /templates/:id`
- Maps HTTP 409 → `error=template_last_default`, other errors → `error=template_delete_failed`

**toggle-active/route.ts** (new)
- `POST` handler receives `templateId` + `active: "true"|"false"`
- Calls `PUT /templates/:id` with `{ active: boolean }`
- Redirects back to the template card with `?templateId=...`

**set-default/route.ts** (new)
- `POST` handler receives `templateId`
- Calls `PUT /templates/:id` with `{ isDefault: true }`
- Redirects back to the template card with `?templateId=...`

**page.tsx** (rewritten)
- Enhanced template cards (`TemplateCard` component):
  - Gold `Défaut` badge (`#C8A96E`) when `isDefault=true`
  - Category badges (outline variant) for each category
  - `opacity-65` tint on inactive templates
  - Inline action buttons: **Dupliquer**, **Désactiver/Activer**, **Définir par défaut** (hidden when already default), **Supprimer** (red, client-side `window.confirm`)
- Filter bar (pill-style links, no new API calls — client-side):
  - Tous · CV · Lettre de motivation · Actifs · Inactifs
  - Category-level filter chips built from all loaded categories
- Predefined category suggestions (ATS · Moderne · Minimaliste · Créatif) shown in both create and edit forms with active/inactive visual state
- Error messages mapped to human-readable French strings

---

## Tests Added / Updated

| File | Coverage |
|------|----------|
| `templates.service.test.ts` | + 4 tests: deleteTemplate happy/transfer/last-guard/not-found |
| `templates.store.test.ts` | + 1 test: remove persists deletion to disk |
| `templates.controller.test.ts` | + 1 test: deleteTemplate admin gate |
| `delete/route.test.ts` | New — 4 tests: success / 404 / 409 / missing-id (coverage 96%) |
| `toggle-active/route.test.ts` | New — 3 tests: deactivate / activate / API error (coverage 90%) |
| `set-default/route.test.ts` | New — 3 tests: success / API error / missing-id (coverage 100%) |
| `page.test.tsx` | + 4 tests: inline actions / gold badge / kind filter / category suggestions |

All tests: 6/6 suites passing. Lint: 6/6 passing. No regressions.

---

## Coverage

New route handlers:
- `delete/route.ts`: 96.3% line
- `set-default/route.ts`: 100% line
- `toggle-active/route.ts`: 90.3% line
All exceed the 90% new-code threshold.

---

## Engineering Standards Compliance

- Clean architecture: Frontend routes call API via HTTP; no domain/infrastructure layer crossings
- Conventional Commits: `feat(templates): ...` ✅
- No new libraries introduced (no ADR needed)
- Accessibility: all action buttons have `aria-label` with template name; color not the sole indicator
- Security: admin session guard on all new API endpoints; no user-controlled data without validation
