# Stage 3 — Implement

**Agent**: developer
**Task**: US-055
**Date**: 2026-04-20

## Summary

US-055 is fully implemented. All five acceptance criteria are satisfied.

## Package name correction

The sprint blocker note asked to verify Puck compatibility. The npm package `@measured-co/puck` no longer exists; the current stable package is `@puckeditor/core@0.21.2`. ADR-003 references have been noted — the codebase now uses `@puckeditor/core` throughout. The package supports React 18 and React 19.

## Changes

### 1. `packages/ui/package.json`
Added `@puckeditor/core: ^0.21.2` as a dependency.

### 2. `packages/types/src/index.ts`
- Removed `TemplateLayoutBlock` and `TemplateLayout` interfaces.
- Added `PuckDataItem` and `PuckData` interfaces that mirror the Puck `Data` type without importing from the library.
- Updated `TemplateRecord.layout` to use `PuckData`.
- Updated `TemplateUpsertInput.layout` to use `PuckData`.

### 3. `packages/ui/src/puck-config.ts` (new file)
Implements `toPuckConfig(registry, kind): Config` that:
- Filters `documentBlockRegistry` entries by `templateKinds`
- Auto-detects array vs scalar fields from `defaultProps` values
- Wraps each block's component as the Puck `render` function

### 4. `packages/ui/src/index.tsx`
Exports `toPuckConfig`.

### 5. `apps/api/src/templates/templates.store.ts`
- Updated `createSeedLayout()` to return `PuckData` format.
- Updated `normalizeTemplate()` to validate the Puck `Data` shape (`content[]`, `root`) instead of `layout.blocks[]`.
- Added `isPuckData()` type guard.

### 6. `apps/api/src/templates/templates.service.ts`
- Updated `normalizeLayout()` to parse and validate the Puck `Data` format (expects `content[]` + optional `root`).
- Throws `BadRequestException` with an updated message when the layout is missing `content`.

### 7. `apps/app/app/admin/templates/page.tsx`
- Updated `resolveBlockInstances()` to accept `ContentItem` (with `.type` and `.props`) instead of the old block shape.
- Updated `TemplatePreview` to iterate `template.layout.content` instead of `template.layout.blocks`.

### 8. `scripts/migrate-templates-to-puck.ts` (new file)
Standalone migration script:
- Reads a `templates-state.json` file path from argv.
- Converts each template with `{ blocks: [] }` layout to `{ content: [], root: { props: {} } }`.
- Preserves block identity (`id` moves from top-level to `props.id`, `name` becomes `type`).
- Is idempotent: skips entries already in Puck format.

### 9. Test updates
- `packages/ui/src/index.test.tsx`: added 5 tests for `toPuckConfig` — CV filter, letter filter, field type detection, label/defaultProps, render function presence.
- `packages/types/src/index.test.ts`: updated template record test to use Puck Data format.
- `apps/api/src/templates/templates.store.test.ts`: updated layout assertions from `layout.blocks` to `layout.content`.
- `apps/api/src/templates/templates.service.test.ts`: updated fixture layouts.
- `apps/app/app/admin/templates/page.test.tsx`: updated all mock templates to Puck Data format.

## Quality gates

- `pnpm build` (types, ui, api): **PASS**
- `pnpm test` (full monorepo): **PASS** — 289 tests, 0 failures
- Coverage `puck-config.ts`: **100%** (new code ≥ 90% requirement satisfied)
- No TypeScript errors in source files
