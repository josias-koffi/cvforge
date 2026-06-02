---
tags: [run/analyze-design-dev-review-20260602160000, workflow/analyze-design-dev-review, agent/product-owner, stage/01]
run: "[[workflows/runs/analyze-design-dev-review-20260602160000/task]]"
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
agent: "[[agents/product-owner/agent]]"
---

# Stage 1 — Analyze (Product Owner)

## Scope

This is a formatting-only improvement to the CV PDF generator. The goal is to make CVs fit on a single A4 page in a fully ATS-compatible layout. No new features, no new sections, no invented data.

**In scope:**
1. CSS changes in `cv-pdf-styles.ts` — margins, font sizes, line height
2. HTML template changes in `cv-html-templates.ts` — skills layout (horizontal), certifications (compact), languages (compact), education (compact)
3. AI prompt changes in `cv-generation.service.ts` — CV_SYSTEM_PROMPT density rules

**Out of scope:** letter generator, new AI features, new UI pages.

## Acceptance Criteria (Testable)

- AC1: `@page` margin is `1.5cm` on all sides in the shared PDF styles
- AC2: `html/body` `font-size` is `9.5pt` and `line-height` is `1.05`
- AC3: `h1` (name) is between 18–20pt
- AC4: Section title (`h2`) is `10pt`
- AC5: Skills section renders hard skills as a single `<p>` of dot-separated tokens — no `<ul>`, no CSS grid columns
- AC6: Soft skills are not rendered at all (neither `h4` nor `<ul>` for soft skills)
- AC7: Languages section renders as a single `<p>` joining all languages with " · "
- AC8: Certifications section renders each cert inline (title · issuer · year) on one `<p>` per cert — no bullet list
- AC9: Education renders each item in compact format without an `item__header` flex layout
- AC10: `CV_SYSTEM_PROMPT` instructs the AI to limit summary to 3 lines max, achievements to 4 bullets for main experience and 2 for freelance

## Product Questions / Risks

- None blocking. All constraints come from the user instruction; no ambiguity on direction.
- Risk: reducing margins to 1.5cm may clip content on some PDF renderers — acceptable trade-off per user decision.

## Verdict

PASS — scope is clear, all ACs are testable, no missing product information.

---
**Navigation**: [[workflows/runs/analyze-design-dev-review-20260602160000/task|Task]] · next [[workflows/runs/analyze-design-dev-review-20260602160000/02-design]]
