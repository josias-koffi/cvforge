# Stage 1 — Analyze

**Agent**: product-owner
**Task**: US-055
**Date**: 2026-04-20

## Scope Assessment

### What the story delivers
US-055 is the foundational sprint-008 story. It installs `@measured-co/puck` and creates the bridge between the existing `documentBlockRegistry` and Puck's `Config` type. It also migrates the persisted template JSON format from the internal `{ blocks: [] }` schema to Puck's native `{ content: [], root: { props: {} } }` format. No UI changes are in scope — those belong to US-056 and US-057.

### Codebase state (verified)
- **`packages/ui/src/document-blocks.tsx`**: Registry exists with 13 block definitions, each carrying `component`, `defaultProps`, `fields[]`, `label`, and `templateKinds[]`. No Puck dependency present.
- **`packages/ui/package.json`**: `@measured-co/puck` is NOT yet installed.
- **`packages/types/src/index.ts`**: `TemplateRecord.layout` is typed as `TemplateLayout` which is `{ blocks: TemplateLayoutBlock[] }` — old format.
- **`apps/api/src/templates/templates.store.ts`**: Seed layouts use `{ blocks: [...] }`. `normalizeTemplate()` validates `layout.blocks` — will need updating after migration.
- **`packages/ui/src/index.tsx`**: `toPuckConfig` is not yet exported.
- **Tests at risk**: `templates.store.test.ts` lines 34–35 assert `layout.blocks` length on seeded templates. These will break if `layout` type changes to Puck `Data` without updating the test.

### Acceptance criteria — testability assessment

| # | Criterion | Testable? | Evidence |
|---|-----------|-----------|---------|
| 1 | `@measured-co/puck` installed in `packages/ui` | ✅ | `packages/ui/package.json` dependency present |
| 2 | `toPuckConfig(registry, kind)` returns valid Puck `Config` | ✅ | Unit test: `config.components` keys match filtered registry names |
| 3 | `TemplateRecord.layout` uses Puck `Data` type | ✅ | TypeScript compilation: `tsc --noEmit` passes |
| 4 | Migration script converts `{ blocks }` → Puck `Data` | ✅ | Script output for seed templates matches expected Puck structure |
| 5 | Existing registry tests pass | ✅ | `pnpm test` green in `packages/ui` |

### Product questions / risks
- **None blocking**: ADR-003 defines the exact adapter contract, the JSON mapping, and the migration approach. All decisions are pre-made.
- **Advisory**: the `normalizeTemplate()` function in `templates.store.ts` currently validates `layout.blocks` specifically. After the migration, it must validate the Puck `Data` shape (`content`, `root`). The store tests asserting `layout.blocks` length must be updated to reflect the new structure. This is within scope of AC #5 ("tests liés au registre").
- **React 18 vs 19**: `packages/ui/package.json` requires React `^19.0.0`. The sprint blocker note says to verify Puck compatibility with React 18. The actual peer requirement is React 18+, and since this project targets React 19, compatibility is satisfied.

## Verdict
**PASS** — Scope is clear. All five acceptance criteria are testable. No unresolved product questions. Ready for Stage 2 (Design).
