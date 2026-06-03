---
tags:
  [
    run/analyze-design-dev-review-20260602140000,
    workflow/analyze-design-dev-review,
    agent/designer,
    stage/02,
  ]
run: "[[workflows/runs/analyze-design-dev-review-20260602140000/task]]"
workflow_def: "[[workflows/definitions/analyze-design-dev-review]]"
agent: "[[agents/designer/agent]]"
previous_stage: "[[workflows/runs/analyze-design-dev-review-20260602140000/01-analyze]]"
---

# Stage 2 — Design

### Verdict: PASS

### Summary

No new UI components required. All changes are targeted refinements to existing letter rendering surfaces. Design decisions are consistent with the current `luxury/refined` aesthetic (Garamond, #1a1a18 palette). UX risks are nil — changes reduce clutter and add missing content.

### Design decisions

**PDF margins (AC-1)**  
Override `@page` only in `renderLetterPdfHtml` inline `<style>` block — not in `SHARED_PDF_STYLES` (which also serves the CV). New values: `margin: 20mm 25mm` (top/bottom 20mm, left/right 25mm).

**Name color (AC-2)**  
Add explicit `color: #1a1a1a` on `h1` inside the letter-specific `<style>` block. Small delta from current `#1a1a18` but honors the instruction.

**Title italic in React preview (AC-3)**  
`LMHeader` component currently omits `props.title`. Add a `<p>` below `HeaderMeta` with `fontStyle: 'italic'` and `subtleTextStyle` color.

**Spacing Objet (AC-4)**  
Current structure: `.sheet { gap: 1.4rem }` applies uniformly. Wrap `[company block + date + objet]` into a tighter inner `<div class="letter-meta">` with `gap: 0.6rem`. The `.sheet` gap then only applies between the hero header, this meta block, body, and signature — eliminating the excessive vertical gap.

**City + date above signature (AC-5)**  
In PDF: add a `<p class="letter-place-date">` element before the signature, composed from `letterContent.candidate.city` + `letterContent.date` (e.g. "Neuville sur Oise, le 2 juin 2025"). In React preview: render same text directly in `LetterDocumentPreview` between the body divider and `LMSignature`. In DOCX: insert a paragraph before the signature.

**Paragraph4 (AC-10, AC-11)**  
`LMBodyProps.paragraph4` is optional (`string | undefined`). All rendering surfaces guard with `if (paragraph4)`. Editor adds a Textarea field labelled "Paragraphe 4". This is fully backwards-compatible with existing stored letters.

### Developer brief

7 files to touch. Changes are surgical — no new abstractions needed. See task.md for file list.

---

**Navigation**: [[workflows/runs/analyze-design-dev-review-20260602140000/task|Task]] · prev [[workflows/runs/analyze-design-dev-review-20260602140000/01-analyze]] · next [[workflows/runs/analyze-design-dev-review-20260602140000/03-implement]]
