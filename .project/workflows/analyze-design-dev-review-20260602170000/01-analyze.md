---
tags: [run/analyze-design-dev-review-20260602170000, workflow/analyze-design-dev-review, agent/product-owner, stage/01]
run: "[[workflows/runs/analyze-design-dev-review-20260602170000/task]]"
agent: "[[agents/product-owner/agent]]"
---

# Stage 1 — Analyze (Product Owner)

## Scope

Skills section rework in the CV PDF generator. Display categorized skills instead of a flat inline list.

**In scope:**
1. New `SkillCategory` type + `skills.categories?` field in `CVDocumentContent`
2. AI prompt update to generate 3 labelled categories
3. Service normalization to extract categories + maintain `hard` flat array for compat
4. HTML template update to render categories with thin rule separators

**Out of scope:** Puck editor, React preview, letter generator, profile editor.

## Acceptance Criteria

- AC1: `SkillCategory` interface exported from `@cvforge/types` with `label: string` and `items: string[]`
- AC2: `CVDocumentContent.skills` has optional `categories?: SkillCategory[]`
- AC3: `CV_SYSTEM_PROMPT` instructs AI to return `skills.categories` array (3 max, 6–10 items each, tools/business/soft split)
- AC4: `normalizeCvJson` extracts `skills.categories` and populates `skills.hard` as flattened items for backward compat
- AC5: PDF template renders `skills.categories` as `<p><strong>Label</strong> : item · item…</p>` per category
- AC6: Skills section in PDF has a thin rule below the h2 (already exists) and above the section (new CSS)
- AC7: All existing tests pass; Puck/preview surfaces unaffected
- AC8: Soft skills are not rendered in PDF (inherited from previous run)

## Verdict

PASS — scope clear, all ACs testable.

---
**Navigation**: [[workflows/runs/analyze-design-dev-review-20260602170000/task|Task]] · next [[workflows/runs/analyze-design-dev-review-20260602170000/02-design]]
