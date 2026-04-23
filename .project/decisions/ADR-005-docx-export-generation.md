# ADR-005: Use docx for DOCX document export
Date: 2026-04-23
Status: accepted

## Context

`US-039` requires DOCX export for generated and edited CV/LM documents. The
repository already has PDF export through a Browserless/Puppeteer boundary, but
DOCX needs a native OpenXML package because Node does not provide a built-in DOCX
writer.

## Decision

Add `docx` to `@cvforge/api` and generate DOCX files server-side from the
normalized `CVDocumentContent` and `LetterDocumentContent` contracts. The app
keeps thin authenticated proxy routes, matching the existing PDF export shape.

## Consequences

- DOCX export stays behind the API authorization boundary.
- The exported file is generated from the same structured content used by PDF
  export and editor previews.
- The first DOCX layout is intentionally conservative and ATS-readable.
- Future template-specific DOCX styling can extend the same exporter without
  changing the public routes.

## Alternatives considered

- Hand-roll OpenXML/ZIP generation: rejected because it is fragile and hard to
  maintain.
- Convert rendered HTML to DOCX: rejected for MVP because it adds less control
  over ATS-friendly document structure.
