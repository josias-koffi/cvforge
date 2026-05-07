# ADR-006: Use pdfjs-dist for PDF offer import with Mistral vision fallback
Date: 2026-05-07
Status: accepted

## Context

`US-052` (V2.0) requires an import path for PDF job offers as a fallback when URL
scraping fails. The candidature ingestion pipeline already supports URL scraping
and manual textarea (landed in `US-019`). PDF import was explicitly deferred from
MVP in `US-019` because no safe file-ingestion path existed at the time.

The backend already uses Mistral Small 4 (multimodal/vision) and has a PDF
rasterisation pipeline for CV/document processing. MinIO is available for file
storage. BullMQ handles async jobs.

Two constraints from the vision must be respected:
- §15: no personally identifiable data from the candidate must be sent to the
  Mistral API.
- §15.4: PDF files must not be retained beyond their processing window.

## Decision

Implement a hybrid extraction strategy in a new BullMQ job `pdf-extract`:

1. **Primary path — local extraction** via `pdfjs-dist`: parse the text layer of
   the PDF without any external API call. Free, RGPD-safe by design.
2. **Fallback path — Mistral vision**: if local extraction yields fewer than 100
   tokens (scanned/image-only PDF), rasterise each page and send to Mistral Small
   4 for OCR-style extraction. The PDF at this point contains only job offer text
   — no candidate personal data.

Flow:
```
POST /candidatures/:id/offer-pdf
  → validate (max 5 MB, PDF mime)
  → upload to MinIO (temp key, TTL 10 min)
  → enqueue BullMQ job pdf-extract
  → job: extractTextLocal() → if tokens >= 100 → done
                             → else → rasterize → Mistral vision → done
  → store result in candidature.offerRawText
  → delete MinIO object immediately after extraction
```

Add `pdfjs-dist` to `@cvforge/api`. No frontend dependency.

## Consequences

- RGPD-safe: the PDF is never retained; MinIO object is deleted in the same job
  run that reads it.
- Works for both native-text PDFs (primary) and scanned PDFs (fallback).
- Reuses the existing Mistral and BullMQ infrastructure — no new runtime.
- The 5 MB / 50-page cap prevents abuse and keeps Mistral token costs negligible
  (< €0.01 per document).
- `pdfjs-dist` is a well-maintained Mozilla project with no transitive security
  concerns for server-side use.

## Alternatives considered

- **pdf-parse**: smaller API but relies on `pdfjs-dist` internally and is less
  maintained; rejected in favour of the canonical upstream package.
- **Mistral vision only (no local extraction)**: rejected because it transmits
  all PDFs externally and fails the §15 RGPD constraint for PDFs that contain
  any candidate context.
- **Textract / AWS**: rejected as it introduces a cloud vendor dependency
  inconsistent with the self-hosted EU data residency principle.
