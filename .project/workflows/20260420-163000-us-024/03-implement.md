# Stage 3 — Implement (Developer)
**Run ID:** 20260420-163000-us-024
**Date:** 2026-04-20

## Implementation Verdict: PASS ✅

---

## Changes Delivered

### packages/ui/src/preview-fixtures.ts (new)
- `CV_PREVIEW_FIXTURE: CVDocumentContent` — persona "Jean Dupont, Chef de projet IT, Lyon"
  - 2 experiences (Banque Crédit Sud 2021–Présent, Logistique Express 2018–2021)
  - 2 education entries (Master Paris-Dauphine, Licence Lyon 3)
  - 6 hard skills + 4 soft skills
  - 2 certifications (PMP, PSM I)
  - 2 languages (Français, Anglais C1)
  - 2 projects
  - 1 summary paragraph
- `LETTER_PREVIEW_FIXTURE: LetterDocumentContent` — same candidate applying to "InnoTech Solutions"
  - 3 body paragraphs
  - company, date, object, signature

### packages/ui/src/index.tsx
- Export `CV_PREVIEW_FIXTURE` and `LETTER_PREVIEW_FIXTURE`

### apps/app/app/admin/templates/page.tsx
- `resolveBlockInstances()` — maps a block + `CVDocumentContent | LetterDocumentContent` to rendered instances:
  - CVHeader → candidate fields
  - SummaryBlock → candidate.summary
  - ExperienceItem → **expands** to one instance per `experiences[i]`
  - EducationItem → **expands** per `education[i]`
  - SkillsList → `{ hardSkills, softSkills }`
  - CertificationItem → **expands** per `certifications[i]`
  - LanguageItem → **expands** per `languages[i]`
  - ProjectItem → **expands** per `projects[i]`
  - LMHeader → candidate + company + date + object
  - LMBody → body
  - LMSignature → signature
  - Divider/SectionTitle → pass through unchanged
- `TemplatePreview` now accepts optional `previewContent?: CVDocumentContent | LetterDocumentContent`
  - When provided: uses fixture props; when absent: falls back to `definition.defaultProps + block.props`
  - Preview container: `#FAFAF7` background, `"EB Garamond", "Libre Baskerville", serif` font, `max-width: 65ch`, italic "Données fictives injectées" label
- "Aperçu live" card always passes `CV_PREVIEW_FIXTURE` for CV templates and `LETTER_PREVIEW_FIXTURE` for letter templates

---

## Tests

| File | New tests | Coverage |
|------|-----------|----------|
| `packages/ui/src/index.test.tsx` | 3 new: fixture shape contract, letter fixture shape, fixture → block render | fixture file 100% |
| `apps/app/app/admin/templates/page.test.tsx` | 2 new: CV fixture injected in preview markup, letter fixture injected | page 93%+ |

All 6 test suites pass. Lint clean.

---

## Engineering Standards

- No new libraries introduced
- New-code coverage: `preview-fixtures.ts` 100% through index tests, `resolveBlockInstances` exercised via page tests
- Clean architecture: data fixtures in `packages/ui` (UI layer); no domain or infra imports
- Accessibility: "Données fictives" label is italic informational text — contrast #6B6860 on #FAFAF7 ~4.8:1 ✅
