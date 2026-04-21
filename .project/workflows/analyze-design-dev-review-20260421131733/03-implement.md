# Stage 3 — Implement

**Agent**: developer
**Sprint**: 008
**Date**: 2026-04-21

## Work performed

- Normalized workspace `test` scripts to `vitest run` so root coverage forwarding does not duplicate `--coverage`.
- Added app tests for:
  - `app/error.tsx`
  - `app/global-error.tsx`
  - `app/admin/templates/puck-template-editor.tsx`
  - `app/cv/[applicationId]/puck-cv-editor.tsx`
- Added a config-package smoke test for `packages/config/eslint/base.cjs`.
- Added the missing `React` import in `apps/app/app/admin/templates/puck-template-editor.tsx` for the Vitest JSX path.

## Validation results

### Test gate

- `pnpm test`: PASS

### Coverage gate

- `pnpm test -- --coverage`: PASS
- `@cvforge/app` coverage:
  - lines: `82.6%`
  - branches: `74.89%`
- `@cvforge/config` coverage:
  - lines: `100%`
  - branches: `100%`

## Coverage impact statement

The prior sprint blockers are resolved. The root coverage command now runs cleanly, and the app package clears the minimum `80%` line and `70%` branch thresholds.

## Pass verdict

Implementation-stage validation passed with all required engineering gates green.
