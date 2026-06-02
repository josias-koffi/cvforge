---
tags: [run/analyze-design-dev-review-20260602160000, workflow/analyze-design-dev-review]
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
---

# Task — ATS CV Generator: One-Page Formatting

**Run ID**: analyze-design-dev-review-20260602160000  
**Type**: Ad hoc  
**Date**: 2026-06-02

## Task Description

Improve the CV PDF generator to produce fully ATS-compliant, single-page CVs. Apply only layout and density changes — no invented content, no new sections.

## Constraints

- **Single page** — everything must fit on one A4 page
- **ATS format** — single column, no tables, no side-by-side columns, no icons, no colors (plain text readable by ATS parsers)

## Required Changes

### Margins & Typography
- Margins: 1.5cm on all sides (currently 20mm top/bottom, 25mm sides)
- Body font size: 9.5pt (currently 10pt)
- Section titles: 10pt (currently 9.5pt small-caps)
- Name (h1): 18–20pt (currently 24pt)
- Line height: 1.05 (currently 1.15)
- Spacing between sections: 4pt max

### Skills Section
- Remove soft skills entirely — ATS doesn't value them, they waste space
- Hard skills displayed in 2 horizontal lines separated by "·", not a vertical bullet list
- No CSS grid/columns for skills

### Languages
- Single compact line: "Anglais C1 – TOEIC 920 · Espagnol B1"

### Certifications
- Single line per certification, no bullets: "Title (year) · Title (year)"

### Education
- Compact single-line per entry: "Degree — Institution, RNCP Level — Year"

### AI Prompt Updates (CV_SYSTEM_PROMPT)
- Profile (summary): max 3 lines, remove hollow phrases ("Passionné par…")
- Experiences: Bouygues-type (main): max 4 bullets, no "veille technologique" bullet; Freelance-type: max 2 bullets, no Power BI bullet (already in skills)
- Formation: 3 formations, each on one compact line

## Files to Touch
- `apps/api/src/cv-generation/cv-pdf-styles.ts` — typography & margins
- `apps/api/src/cv-generation/cv-html-templates.ts` — HTML structure (skills, certifications, languages, education layout)
- `apps/api/src/cv-generation/cv-generation.service.ts` — CV_SYSTEM_PROMPT rules
