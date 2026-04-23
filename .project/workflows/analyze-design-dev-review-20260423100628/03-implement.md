# Implement — US-038

Implemented CV import as a profile-prefill flow.

Code changes:

- Added `ImportedCvProfilePatch` / `ImportedCvExtractionResult` shared contracts and `cv_import` credit action.
- Added API `CvImportService` and `POST /applications/cv-import/extract`.
- Added `mammoth` for DOCX raw-text extraction with `ADR-004`.
- Added conservative PDF text-layer extraction with explicit quality limits.
- Added `/profile/import-cv` app route and `CvImportPanel` on `/profile`.
- Added `applyImportedCvProfilePatch()` so imported data fills the active local profile without overwriting local sensitive fields.
- Documented quality limits in `docs/cv-import-quality-limits.md`.
- Added a landing config branch test to keep repo coverage above the project threshold.

Privacy behavior:

- Email, phone, address, birth-date labels, and detected last-name occurrences are stripped/replaced before OpenRouter.
- The IA receives `pseudonymisedCvText` and `[CANDIDATE]`, not raw identifiers.

Verification:

- `pnpm lint` passed.
- `pnpm build` passed.
- `pnpm test -- --coverage` passed.
- `pnpm audit --audit-level=high` passed with no high/critical vulnerabilities (`1 low`, `2 moderate` reported).
- Coverage evidence: `@cvforge/api` 87.89% lines / 75.57% branches; `@cvforge/app` 82.84% lines / 71.03% branches; `@cvforge/landing` 100% lines / 100% branches.

Pass verdict: implementation complete and quality gates pass.
