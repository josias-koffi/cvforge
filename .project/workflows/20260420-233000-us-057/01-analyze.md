# Stage 1 — Analyze

**Agent**: product-owner
**Date**: 2026-04-20

## Scope Summary

US-057 replaces the large `CvEditor` shadcn/ui form with Puck Editor in content-only mode. The key constraint is "content-only": users can edit field values but cannot add, remove, reorder, or duplicate blocks. This preserves the AI-generated document structure while allowing personalisation.

## Data Flow Analysis

Current:
- `page.tsx` fetches `CVDocumentContent` from API → passes to `CvEditor`
- `CvEditor` maintains `draft: CVDocumentContent` state → saves via `PUT /cv/:id/save` → API `PUT /applications/:id/cv`

Target:
- `page.tsx` fetches `CVDocumentContent` → converts to `PuckData` via `cvContentToPuckData()` → passes to `CvEditor`
- `CvEditor` renders mobile `<Render>` + desktop `<PuckCvEditorLoader>`
- `PuckCvEditor.onPublish(data)` converts `PuckData` → `CVDocumentContent` via `puckDataToCvContent()` → saves via `PUT /cv/:id/save`
- PDF export: unchanged (reads `CVDocumentContent` from API store)

## Acceptance Criteria Mapping

| Criterion | Implementation |
|-----------|---------------|
| `<Puck>` with restricted permissions | `PuckCvEditor` component with `permissions={{ delete: false, drag: false, duplicate: false, insert: false }}` |
| AI content loaded as PuckData | `cvContentToPuckData()` converter called in `page.tsx` before rendering |
| Save via `PUT /applications/:id/cv` | `PuckCvEditor.onPublish` converts PuckData → CVDocumentContent → calls `/cv/:id/save` route |
| Mobile `<Render>` (SSR-safe) | `<Render>` from `@puckeditor/core` used directly in `CvEditor` (no `next/dynamic`) |
| PDF export compatible | PDF reads `CVDocumentContent` from API; as long as the reverse converter is faithful, no API changes needed |

## PuckData ↔ CVDocumentContent Mapping

CVDocumentContent fields map to these Puck blocks:
- `candidate` (identity fields) → `CVHeader`
- `candidate.summary` → `SummaryBlock`
- `experiences[]` → `ExperienceItem` × n
- `education[]` → `EducationItem` × n
- `skills.hard/soft` → `SkillsList` (note: Puck field names are `hardSkills`/`softSkills`)
- `certifications[]` → `CertificationItem` × n
- `languages[]` → `LanguageItem` × n
- `projects[]` → `ProjectItem` × n
- Structural blocks (`Divider`, `SectionTitle`) inserted between sections in forward direction, skipped in reverse

## Missing/Open Questions

None blocking — scope is fully clear. The `SkillsList` field name mismatch (`hard/soft` vs `hardSkills/softSkills`) must be handled explicitly in both converters.

## Pass Verdict

✅ Scope clear, acceptance criteria testable, no blockers.
