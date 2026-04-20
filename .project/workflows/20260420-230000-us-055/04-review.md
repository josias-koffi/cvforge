# Stage 4 — Review

**Agent**: qa-reviewer
**Task**: US-055
**Date**: 2026-04-20

## Acceptance Criteria Verification

| # | Criterion | Evidence | Verdict |
|---|-----------|----------|---------|
| 1 | `@measured-co/puck` est installé dans `packages/ui` | `@puckeditor/core@0.21.2` present in `packages/ui/package.json` (package was renamed; functionally equivalent — see implementation note) | ✅ PASS |
| 2 | `toPuckConfig(registry, kind)` produit un `Config` Puck valide filtré par `templateKind` | `packages/ui/src/puck-config.ts` implemented; 5 tests covering CV filter, letter filter, field type detection, label/defaultProps, and render function presence — all pass | ✅ PASS |
| 3 | Le type `TemplateRecord.layout` est mis à jour vers le type `Data` de Puck | `packages/types/src/index.ts`: `TemplateRecord.layout` now uses `PuckData` interface (mirrors Puck `Data`). `packages/types` build passes with `tsc --noEmit`. | ✅ PASS |
| 4 | Un script de migration convertit les templates existants de `{ blocks: [] }` vers `{ content: [], root: { props: {} } }` | `scripts/migrate-templates-to-puck.ts` implemented; idempotent, handles legacy `{ blocks }` and already-migrated entries | ✅ PASS |
| 5 | Les tests existants liés au registre passent après migration | Full monorepo: 289 tests, 0 failures. All registry-related tests in `packages/ui`, `packages/types`, `apps/api`, and `apps/app` pass after updating fixtures and assertions to Puck format. | ✅ PASS |

## Blocking Defects

None.

## Engineering Standards Checks

| Rule | Verdict | Notes |
|------|---------|-------|
| Clean architecture | ✅ | `puck-config.ts` is in the Interface layer (`packages/ui`); no domain/application layers import from it |
| Test coverage — new code ≥ 90% | ✅ | `puck-config.ts`: 100% stmt/func/line, 100% branch |
| Conventional Commits | ✅ (advisory) | Not committed yet; commit must use `feat(puck): ...` |
| ADR for stack changes | ✅ | ADR-003 exists and covers this dependency; package name discrepancy (`@measured-co/puck` vs `@puckeditor/core`) should be updated in ADR-003 as an advisory note |
| Accessibility | ✅ N/A | No UI surface added in this story |
| Security baseline | ✅ | No new user-input surface; migration script processes local files only |

## Advisories (non-blocking)

1. **ADR-003 package name**: ADR-003 references `@measured-co/puck` but the installed package is `@puckeditor/core`. Update the ADR to reflect the correct package name.
2. **`TemplateInput.layout` type in `templates.types.ts`**: Uses `TemplateRecord["layout"]` which now correctly resolves to `PuckData`. No change needed, but worth noting the indirect coupling is deliberate.
3. **`normalizeLayout` error message**: Updated from "doit contenir des blocs" to "doit contenir un tableau 'content' (format Puck Data)". This is an improvement.

## Verdict

**PASS** — All five acceptance criteria verified. No blocking defects. Tests green across the full monorepo. Ready for finalization.
