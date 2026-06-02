---
tags: [run/analyze-design-dev-review-20260602160000, workflow/analyze-design-dev-review, agent/designer, stage/02]
run: "[[workflows/runs/analyze-design-dev-review-20260602160000/task]]"
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
agent: "[[agents/designer/agent]]"
previous_stage: "[[workflows/runs/analyze-design-dev-review-20260602160000/01-analyze]]"
---

# Stage 2 — Design (Designer)

## Design Decisions

### Typography & Spacing (cv-pdf-styles.ts)
- `@page` margin: `1.5cm` (all sides) — replaces current `20mm 25mm`
- `html/body` font-size: `9.5pt`, line-height: `1.05`
- `h1` (name): `18pt` — midpoint of allowed 18–20pt range, safe for long names
- `h2` (section title): `10pt` small-caps (currently 9.5pt — this counter-intuitively increases, but user specified 10pt for section headers)
- `h3` (item title): `10pt` (down from 10.5pt)
- `.company`, `.date-range`: `9.5pt`
- `li` font-size: `9.5pt` (down from 10pt)
- `.item` `margin-bottom`: `4pt` (down from 6pt)
- `h2` `margin-top`: `5pt` (down from 8pt)

### Skills Section (cv-html-templates.ts)
- Remove CSS grid layout entirely
- Remove soft skills block unconditionally
- Hard skills rendered as a single `<p class="skills-inline">` with items joined by ` · `
- Max 12 items shown (generous limit, ATS reads all)

### Languages Section
- Render as single `<p>`: items joined by ` · `, each formatted as `language – level`

### Certifications Section
- Render each certification as a `<p>`: `title (year) · issuer` — no bullets

### Education Section
- Remove `item__header` flex layout
- Render each item as single `<p>`: `degree — institution · mention — year`

### AI Prompt (cv-generation.service.ts)
- Summary: add explicit rule "3 lignes maximum, supprimer les formules creuses"
- Achievements: main experience max 4, freelance max 2, note bullet on "veille technologique" is least impactful
- Education formatting guidance added for compact output

## UX Risks
- Compact education format loses the degree/year visual separation — acceptable for ATS; humans reading PDF still get the info
- No icons/colors: current template already has no icons/colors — no change needed there
- No columns: skills grid removed

## Verdict

PASS — design fits scope, all non-UI decisions are explicit.

---
**Navigation**: [[workflows/runs/analyze-design-dev-review-20260602160000/task|Task]] · prev [[workflows/runs/analyze-design-dev-review-20260602160000/01-analyze]] · next [[workflows/runs/analyze-design-dev-review-20260602160000/03-implement]]
