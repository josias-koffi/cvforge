# Stage 3 — Implement

Agent: developer
Verdict: passed

Implemented DOCX export and version history across API, app, shared types, tests, and ADR.

Key changes:

- Added `docx@9.6.1` to `@cvforge/api`.
- Added `ADR-005-docx-export-generation.md`.
- Extended shared types with CV/LM version entries and version source.
- Persisted `cvVersions` and `letterVersions` in the application store, including legacy hydration for existing generated documents.
- Appended version snapshots on CV/LM generation and manual save.
- Added API endpoints for `cv/docx`, `letter/docx`, `cv/versions`, and `letter/versions`.
- Added app proxy routes for DOCX downloads.
- Added DOCX buttons and visible version-history cards to CV and LM editors.

Verification:

- `pnpm lint` passed.
- `pnpm test` passed.
- `pnpm build` passed.
- `pnpm test -- --coverage` passed after rerun; the first coverage attempt hit a transient API bootstrap timeout, and the rerun completed successfully.

Coverage evidence from final run: API `86.54%` lines / `74.29%` branches; app `82.72%` lines / `70.01%` branches.
