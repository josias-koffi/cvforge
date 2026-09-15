# ADR-009: Local OCR (tesseract.js) for scanned CV imports

Date: 2026-09-15
Status: accepted

## Context

CV import reads the PDF text layer with `pdfjs-dist` (ADR-006 addendum). Scanned or
image-only PDFs have no text layer, so the import fails with a 422.

ADR-006 plans a Mistral vision fallback for scanned **job offers**. That path does not
transfer to CVs: an image of a CV necessarily shows the last name, e-mail, phone and
often the address, and vision §15.3 forbids sending these to any AI call. Masking those
areas on the image cannot be done reliably.

## Decision

When the PDF text layer yields fewer than 120 characters, the API OCRs the document
locally and then runs the existing pipeline (pseudonymisation → text-only AI call):

1. `renderPdfPages` rasterises the first 4 pages with `pdfjs-dist` on `@napi-rs/canvas`
   (scale 2, opaque white background).
2. `recognizeImages` runs `tesseract.js` 7 (WASM, LSTM only) with French and English.
3. Trained data comes from the `@tesseract.js-data/fra` and `@tesseract.js-data/eng`
   npm packages (`4.0.0_best_int`), copied once per process to a tmp directory: the server
   never downloads models at runtime and nothing leaves the server before pseudonymisation.

Dependencies added to `@cvforge/api`: `tesseract.js`, `@tesseract.js-data/fra`,
`@tesseract.js-data/eng`, `@napi-rs/canvas` (already an optional dependency of `pdfjs-dist`,
now explicit because rendering relies on it).

## Consequences

- Scanned CVs are importable while respecting §15.3; no extra AI cost.
- OCR costs about 1 s of worker start-up plus 2-4 s per page of CPU on the API process;
  the 4-page cap bounds a request. Should imports become frequent, move OCR to a job queue.
- OCR quality depends on scan resolution; large decorative headings (often the name) can be
  misread, which also weakens the first-lines last-name heuristic of the pseudonymiser.
  E-mail and phone masking is regex-based and unaffected.
- The image grows by ~15 MB of trained data plus the WASM core.
- tesseract.js 7's `{ code, data }` language form is broken (the worker initialises with the
  data instead of the code), hence the shared `langPath` directory.

## Alternatives considered

- **Vision AI (Mistral Small via OpenRouter, ZDR)**: better on complex layouts, but sends
  directly identifying data to the AI — rejected (§15.3).
- **Two-step vision (OCR call, then pseudonymised extraction)**: the first call still sees
  the identifiers — rejected for the same reason, at twice the cost.
- **System Tesseract binary**: faster, but adds an OS package and a child process to the
  Alpine image; the WASM build keeps the API a pure Node dependency.
