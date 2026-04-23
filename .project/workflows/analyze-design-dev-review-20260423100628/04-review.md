# Review — US-038

Acceptance criteria:

| Criterion | Evidence | Verdict |
| --- | --- | --- |
| L'import de CV est disponible | `/profile` renders `CvImportPanel`; `/profile/import-cv` proxies uploads; API exposes `POST /applications/cv-import/extract`; tests cover route and service behavior. | PASS |
| Le pipeline d'extraction respecte la pseudonymisation | `CvImportService` strips email, phone, address, birth-date labels and detected last name before `openRouter.chat`; test asserts no raw email/phone/last name reaches the payload and `[CANDIDATE]` is used. | PASS |
| Les limites de qualité sont documentées | Inline profile UI copy, `QUALITY_LIMITS` returned by API, and `docs/cv-import-quality-limits.md` document PDF/DOCX and extraction limits. | PASS |

Blocking checks:

- Clean architecture: PASS. API extraction stays in `cv-generation`; app only proxies and applies the returned profile patch locally.
- ADR for new dependency: PASS. `ADR-004` documents `mammoth`.
- Lint: PASS via `pnpm lint`.
- Tests: PASS via `pnpm test -- --coverage`.
- Build: PASS via `pnpm build`.
- Coverage: PASS. Package-level line/branch coverage meets the spec thresholds after the landing branch gap was closed.
- Dependency audit: PASS via `pnpm audit --audit-level=high`; no high/critical vulnerabilities.

Advisory:

- PDF extraction is intentionally conservative until a full PDF/OCR stack is justified; the limitation is user-visible and documented.

Final QA verdict: PASS.
