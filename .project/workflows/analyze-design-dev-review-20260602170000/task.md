---
tags: [run/analyze-design-dev-review-20260602170000, workflow/analyze-design-dev-review]
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
---

# Task — Compétences structurées par catégories (format listing)

**Run ID**: analyze-design-dev-review-20260602170000  
**Type**: Ad hoc  
**Date**: 2026-06-02

## Task Description

Reworking the CV skills section so it renders as a structured block of 3 labelled categories (instead of a flat dot-separated list). The block is placed just after the Profile and before the Experiences, separated by thin rules.

## Required Format

```
[Label catégorie] : Item 1 · Item 2 · Item 3 · Item 4
```

Each category on its own line, label in bold, items 1–3 words each separated by " · ".

## Rules (AI generation)

- 3 categories maximum, named per candidate profile
- Category 1: tools & software (ATS priority)
- Category 2: business / operational skills
- Category 3: soft skills or transversal competency
- 6–10 items per category
- Only use skills already mentioned elsewhere in the CV — never invent
- Items: 1–3 words each

## Files to Touch

- `packages/types/src/index.ts` — add `SkillCategory` interface, add `categories?: SkillCategory[]` to `CVDocumentContent.skills`
- `apps/api/src/cv-generation/cv-generation.service.ts` — update `CV_SYSTEM_PROMPT` output schema + rules, update `RawCvJson`, update `normalizeCvJson`
- `apps/api/src/cv-generation/cv-html-templates.ts` — render `skills.categories` if present, add thin-rule CSS

## Backward Compat Constraint

`skills.hard` and `skills.soft` must remain populated (flatten categories → hard) so the Puck editor (`cv-content-to-puck.ts`, `puck-data-to-cv-content.ts`) and the React preview (`cv-document-preview.tsx`) continue to work without changes.
