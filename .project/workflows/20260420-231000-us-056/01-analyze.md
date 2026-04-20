# Stage 1 — Analyze (Product Owner)

**Date**: 2026-04-20
**Verdict**: PASS

## Scope Confirmation

US-056 is the second story in Sprint 008. US-055 (foundation) is complete: `@puckeditor/core@0.21.2` is installed in `packages/ui`, `toPuckConfig()` adapter exists, and `TemplateRecord.layout` is typed as `PuckData`.

**In scope:**
- Replace the JSON textarea in the "Editeur Puck" admin card with a live `<Puck>` canvas filtered by template kind
- Wire Puck's `onPublish` to `PUT /templates/:id` (layout-only update) via a new Next.js JSON route
- Load `<PuckTemplateEditor>` with `next/dynamic` + `ssr: false` (Puck uses browser-only APIs)
- Create flow: keep existing metadata form; after template creation the Puck editor loads with empty canvas

**Out of scope:**
- US-057 (user-side Puck editor for CVs) — separate story
- Changing the template kind after creation
- PDF export changes

## Testable Acceptance Criteria

1. The Textarea for layout JSON in the edit card is gone; a Puck canvas renders in its place
2. The Puck component palette shows only blocks matching the template kind (CV or LM)
3. Clicking Puck's "Publish" button triggers `PUT /templates/:id` with the new layout; the API persists it
4. No SSR errors: `<PuckTemplateEditor>` is loaded with `ssr: false` via `next/dynamic`
5. Creating a new template (via the existing metadata form) redirects to the edit view with an empty Puck canvas

## Product Questions
None blocking. The split between metadata save and layout save is a UX decision: keeping them separate avoids the complexity of synchronising Puck state with the HTML form before submission.

## Missing Context
None. All infrastructure is in place from US-055.
