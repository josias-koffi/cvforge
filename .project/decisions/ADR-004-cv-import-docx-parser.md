# ADR-004: Use Mammoth for DOCX text extraction during CV import

Date: 2026-04-23
Status: accepted

## Context

`US-038` adds import of an existing CV to prefill a base profile. The API must extract text before sending a pseudonymised payload to OpenRouter. The repository had no DOCX text extraction dependency.

## Decision

Add `mammoth` to `@cvforge/api` and use `mammoth.extractRawText()` for DOCX imports. PDF imports are accepted through the same upload path and handled with a conservative built-in text-layer heuristic until a dedicated PDF/OCR parser is justified.

## Consequences

- DOCX imports get a maintained parser without adding a larger document-conversion stack.
- PDF quality is explicitly limited: image-only PDFs, compressed streams, tables, and multi-column layouts may require manual correction.
- The OpenRouter prompt receives only pseudonymised extracted text; direct identifiers are stripped before the IA call.

## Alternatives Considered

- Add a full PDF/OCR stack now: rejected for this sprint because it would add heavier dependencies and storage/processing concerns not required to expose the V1.1 import flow.
- Send the raw file to the IA model: rejected because the vision requires pseudonymisation before IA calls.
- DOCX-only import: rejected because the acceptance criteria and vision mention PDF or DOCX upload.
