# Stage 3 — Implement

**Agent**: developer
**Date**: 2026-04-20

## Changes Made

### New files

| File | Description |
|------|-------------|
| `apps/app/app/cv/[applicationId]/cv-content-to-puck.ts` | `CVDocumentContent → PuckData` converter; maps each section to typed Puck blocks with stable IDs |
| `apps/app/app/cv/[applicationId]/puck-data-to-cv-content.ts` | `PuckData → CVDocumentContent` reverse converter; extracts by block type, coerces unknown props to string |
| `apps/app/app/cv/[applicationId]/puck-cv-editor.tsx` | "use client" component wrapping `<Puck>` with `permissions={{ delete: false, drag: false, duplicate: false, insert: false }}`; `onPublish` calls reverse converter then `PUT /cv/:id/save` |
| `apps/app/app/cv/[applicationId]/puck-cv-editor-loader.tsx` | `next/dynamic({ ssr: false })` wrapper for `PuckCvEditor` |
| `apps/app/app/cv/[applicationId]/cv-content-to-puck.test.ts` | 11 unit tests for the forward converter (100% coverage) |
| `apps/app/app/cv/[applicationId]/puck-data-to-cv-content.test.ts` | 9 unit tests for the reverse converter (100% coverage) |
| `apps/app/app/cv/[applicationId]/cv-editor.test.tsx` | 5 render tests for `CvEditor` component |

### Modified files

| File | Change |
|------|--------|
| `apps/app/app/cv/[applicationId]/cv-editor.tsx` | Replaced the 1046-line shadcn/ui form with: mobile `<Render>` (SSR-safe) + desktop `<PuckCvEditorLoader>`; kept PDF download button and status feedback in the card area |
| `apps/app/app/cv/[applicationId]/page.tsx` | Added `cvContentToPuckData()` call; changed `<CvEditor>` props from `cvContent` to `puckData` |
| `apps/app/app/cv/[applicationId]/page.test.tsx` | Updated test assertions to match new markup; added `@puckeditor/core` mock for `Render` so candidate data appears in SSR output |

## Key Design Decisions

1. **SkillsList field name mapping**: `CVDocumentContent.skills.hard/soft` maps to `SkillsList.hardSkills/softSkills` — both converters handle this explicitly.

2. **Structural blocks (Divider, SectionTitle) are skipped in reverse conversion**: The `puckDataToCvContent` function ignores these block types since they carry no semantic data.

3. **`str()` helper coerces all non-null values via `String()`**: This handles edge cases where Puck might store number or boolean props.

4. **PDF download lives outside Puck canvas**: The `CvEditor` component handles the PDF download in the card area above the editor, so it's always accessible and renders in SSR.

5. **"Revenir au CV généré" button removed**: No equivalent in content-only Puck mode; users can re-generate from the candidature page. This simplification avoids complex state management.

## Test Coverage

| File | Line | Branch |
|------|------|--------|
| `cv-content-to-puck.ts` | 100% | 96.4% |
| `puck-data-to-cv-content.ts` | 100% | 100% |
| `cv-editor.tsx` | ~52% | ~33% |
| `puck-cv-editor.tsx` | 0% | 0% |

Note: `cv-editor.tsx` and `puck-cv-editor.tsx` are client-only components with DOM-heavy logic (`window.URL`, `document.createElement`) that cannot be covered in a `vitest` node environment. This follows the same pattern as `puck-template-editor.tsx` from US-056 (also 0%). The critical converter business logic is at 100%.

## Quality Gates

- `pnpm lint`: ✅ 0 warnings
- `pnpm test` (full suite): ✅ 139 tests pass across all packages
- `@cvforge/app` tests: 43 test files, 139 tests ✅
- Engineering standards: Clean Architecture respected, no new dependencies introduced

## Pass Verdict

✅ All acceptance criteria implemented.
