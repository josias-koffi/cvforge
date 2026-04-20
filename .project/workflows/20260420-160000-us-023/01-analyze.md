# Stage 1 — Analyze (Product Owner)
**Run ID:** 20260420-160000-us-023
**Date:** 2026-04-20

## Scope Verdict: CLEAR ✅

## Acceptance Criteria — Testability Review

### AC1: Un template peut être dupliqué
**Status:** Backend implementation exists (`POST /templates/:id/duplicate`). The duplicate route exists on the frontend (`/admin/templates/duplicate`). A duplicate button exists on the admin page.

**Gap**: The acceptance criterion is broadly met, but UX confirmation is needed — the button must be visible without entering edit mode, and feedback after duplication must be clear.

**Testable**: ✅ Call `POST /templates/:id/duplicate` → response contains a new template record with same kind/layout but new id, `active=false`, `isDefault=false`.

### AC2: Les tags/catégories sont gérés
**Status:** `categories: string[]` field exists on `TemplateRecord`. API supports creating and updating with categories. Frontend has comma-separated input.

**Gap**: UX is poor — predefined category suggestions from the vision (ATS, Moderne, Minimaliste, Créatif) are not surfaced; categories are filtered in the service to max 10, trimmed, but no UI enforcement. No list filtering by category exists.

**Testable**: ✅ Create/update a template with `categories: ["ATS", "Créatif"]` → retrieved record shows those categories. Admin list can be filtered by category.

### AC3: Un template par défaut est définissable par type
**Status:** `isDefault: boolean` exists. Service enforces one default per kind (CV or letter). Changing a template to default removes the flag from other same-kind templates.

**Gap**: No visual indicator in the list view shows which template is currently the default for each type. Setting the default requires opening the edit form.

**Testable**: ✅ Mark template T1 as default for CV → T1 has `isDefault=true`, all other CV templates have `isDefault=false`. The admin list visually marks the default.

## Product Boundaries

### In scope (US-023):
1. Quick **activate/deactivate toggle** button directly on template card/row (no edit form needed)
2. **Category picker UX**: Badge-based predefined suggestions (ATS, Moderne, Minimaliste, Créatif) + custom input, displayed on template cards
3. **Default marker**: Visual badge "Par défaut" in the list for each kind; clickable to change default without opening edit form
4. **Add DELETE endpoint** to API (`DELETE /templates/:id`) with usage check (block if used in candidatures — note: candidature system currently stores template references, safe to check)
5. **Delete button** with confirmation dialog in admin UI
6. **Filter bar** in admin template list: filter by kind (CV/LM), active status (actif/inactif), category

### Out of scope (already done in US-022):
- Creating templates in Puck Editor
- Modifying template layout
- Storing templates in JSON/PostgreSQL

### Out of scope (future US-024):
- Preview with injected fictitious data

## Missing Product Questions

None blocking. The vision is explicit (§6.7, §13.3) on all three acceptance criteria. The delete-with-verification requirement is stated in §13.3 ("Supprimer (avec vérification : template utilisé dans des candidatures ?)"). In MVP, candidature storage uses template IDs — a simple check suffices.

## Risk Notes

- The one-default-per-kind constraint must be respected when deleting a default template: the service must either refuse deletion or transfer the default to another template of the same kind.
- Category suggestions should be additive (user can type custom categories beyond the four predefined).
