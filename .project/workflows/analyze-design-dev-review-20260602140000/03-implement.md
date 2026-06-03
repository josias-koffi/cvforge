---
tags:
  [
    run/analyze-design-dev-review-20260602140000,
    workflow/analyze-design-dev-review,
    agent/developer,
    stage/03,
  ]
run: "[[workflows/runs/analyze-design-dev-review-20260602140000/task]]"
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
agent: "[[agents/developer/agent]]"
previous_stage: "[[workflows/runs/analyze-design-dev-review-20260602140000/02-design]]"
---

# Stage 3 — Implement

### Verdict: PASS

### Summary

7 files modified. All 247 API tests pass. TypeScript builds clean on `types` and `ui` packages. Pre-existing test-file TS errors in `app` package are unrelated to this change (cv-editor.test, dashboard.test, interview.test — missing props in test stubs from a previous sprint).

### Changes applied

**`packages/types/src/index.ts`**

- `LMBodyProps.paragraph4?: string` added (optional, backwards-compatible)

**`packages/ui/src/document-blocks.tsx`**

- `LMHeader`: explicit `color: #1a1a1a` on h1; title rendered italic below contact line
- `LMBody`: renders paragraph4 if truthy
- `LMHeader`: company block tightened (gap 0.15rem); date extracted to its own row for cleaner spacing

**`apps/api/src/cv-generation/cv-html-templates.ts`**

- `@page` margin overridden to `20mm 25mm` for letter PDF
- h1 color explicitly `#1a1a1a`
- Company + date + Objet wrapped in `.letter-meta { gap: 0.6rem }` — eliminates excessive vertical gap
- paragraph4 rendered conditionally
- `placeDate` line (city + "le" + date) inserted before signature

**`apps/api/src/cv-generation/cv-docx-templates.ts`**

- Contact separator changed from `|` to `·` to match PDF
- Name bold with 28pt size (was buried in generic paragraph)
- Title rendered only if non-empty
- paragraph4 conditional
- placeDate paragraph before signature name

**`apps/api/src/cv-generation/cv-generation.service.ts`**

- `LETTER_SYSTEM_PROMPT`: 4-paragraph structure, metrics instruction, personalized closing, politeness formula in paragraph4
- `RawLetterJson.body.paragraph4?: unknown` added
- `normalizeLetterJson`: maps paragraph4 conditionally
- `normalizeUpdatedLetterContent`: maps paragraph4 conditionally (manual-save path)

**`apps/app/app/letters/[applicationId]/letter-document-preview.tsx`**

- placeDate (city + "le" + date) rendered between body and signature

**`apps/app/app/letters/[applicationId]/letter-editor.tsx`**

- Paragraph 4 Textarea field added to the editor form

### Quality gates

- API: 247/247 tests pass
- `@cvforge/types` tsc: clean
- `@cvforge/ui` tsc: clean
- `@cvforge/api` tsc: clean
- `@cvforge/app` tsc: 8 pre-existing errors in test files, none in changed files

### Next action

QA verification of all 11 acceptance criteria.

---

**Navigation**: [[workflows/runs/analyze-design-dev-review-20260602140000/task|Task]] · prev [[workflows/runs/analyze-design-dev-review-20260602140000/02-design]] · next [[workflows/runs/analyze-design-dev-review-20260602140000/04-review]]
