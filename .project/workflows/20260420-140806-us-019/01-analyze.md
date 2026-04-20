# Stage 1 — Analyze

Agent: `product-owner`
Verdict: `pass`

## Scope

`US-019` extends the existing candidature-creation slice with the missing manual fallback:

- a candidate can still import an offer from a URL
- a candidate can alternatively paste the offer text directly when scraping is unavailable
- both paths create the same persisted draft candidature shape
- the MVP must make an explicit go/no-go decision on PDF fallback without delaying delivery

## Explicitly Out of Scope

- real PDF upload, storage, OCR, or multimodal extraction
- recruiter/company enrichment beyond the current extraction payload
- candidature status pipeline (`US-020`)
- CV/LM generation, ATS scoring, or interview flows

## Testable Acceptance Mapping

1. `Le fallback texte est disponible`
   Evidence can be an authenticated UI and API path that accepts pasted offer text and persists a draft candidature through the existing extraction flow.
2. `La faisabilite du fallback PDF MVP est statutee`
   Evidence can be an explicit workflow decision that evaluates the current architecture and states whether PDF import ships now or is deferred.
3. `Si le fallback PDF est trop couteux, le report est documente sans casser le MVP`
   Evidence can be a documented defer decision tied to the existing MVP path, showing that URL plus text ingestion still keeps candidature creation usable.

## Product Decisions

- Reuse the existing `applications` boundary for the text fallback instead of creating a parallel manual-entry flow elsewhere.
- Keep the same extracted candidature output shape for URL and text ingestion so later pipeline work stays source-agnostic.
- Defer PDF fallback for MVP: the current codebase lacks the upload, storage, parsing, and privacy-hardening layers needed to ship it safely within this sprint.

## Missing Product Questions

- None blocking for `US-019`.
- A later story should decide whether PDF ingestion uses text extraction, rasterized multimodal extraction, or both.
