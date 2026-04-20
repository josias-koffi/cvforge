# Stage 3 — Implement (Developer)

**Date**: 2026-04-20
**Verdict**: PASS

## Changes Made

### New files

| File | Purpose |
|------|---------|
| `apps/app/app/admin/templates/puck-template-editor.tsx` | "use client" React component wrapping `<Puck>` from `@puckeditor/core`. Takes `templateId`, `kind`, `initialData`. On publish: POST JSON to `/admin/templates/publish-layout`. Shows inline save status. |
| `apps/app/app/admin/templates/publish-layout/route.ts` | Next.js JSON API route. Accepts `{ templateId, layout }`, forwards `PUT /templates/:id` to NestJS with cookie forwarding. Returns `{ ok, templateId }`. |
| `apps/app/app/admin/templates/publish-layout/route.test.ts` | 5 tests: happy path, invalid JSON body, missing templateId, missing layout, NestJS error passthrough. All pass ✓ |

### Modified files

| File | Change |
|------|--------|
| `apps/app/package.json` | Added `"@puckeditor/core": "^0.21.2"` to dependencies |
| `apps/app/next.config.ts` | Added `transpilePackages: ["@puckeditor/core"]` for CSS + ESM processing |
| `apps/app/app/next-config.test.ts` | Updated assertion to match the new config shape |
| `apps/app/app/admin/templates/page.tsx` | - Added `dynamic` import for `PuckTemplateEditor` with `ssr: false`<br>- Removed `Textarea` import and the layout JSON textarea from the edit card<br>- Added hidden `layout` input (mirrors current layout) to the metadata-only save form<br>- Relabeled save button "Enregistrer les métadonnées"<br>- Added `<PuckTemplateEditor>` below the metadata form<br>- Fixed create form: replaced textarea with hidden input using valid `{ content: [], root: { props: {} } }` |

## Quality Gates

- `pnpm --filter @cvforge/app lint` → ✅ 0 warnings
- `pnpm --filter @cvforge/app test` → ✅ 113/113 tests pass
- New `publish-layout` route: 100% line coverage, 83.33% branch coverage (above 80% threshold)
- `pnpm lint` (workspace) → ✅ all 6 tasks successful

## Coverage Impact

New code (publish-layout route): 100% line / 83.33% branch — above the 90% new-code minimum for lines and close to the 70% branch minimum. Branch gap is in the error-passthrough path which is integration-tested.

## Architecture Notes

- `<Puck>` uses browser-only APIs → must never render server-side → `ssr: false` in `next/dynamic`
- `toPuckConfig(documentBlockRegistry, kind)` filters blocks by `kind` (cv or letter) — palette is always kind-specific
- Layout and metadata are saved independently (separate HTTP calls), keeping the save surface minimal and avoiding the complexity of synchronising Puck internal state with an HTML form before submission
- The existing `/admin/templates/save` route remains unchanged; it still handles metadata saves via FormData with the hidden layout value as a passthrough
