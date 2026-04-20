# Stage 1 — Analyze

Agent: `product-owner`
Verdict: `pass`

## Scope

`US-018` is limited to the first executable candidature-ingestion slice:

- an authenticated candidate can submit an offer URL
- the backend attempts server-side HTML retrieval and text extraction
- useful candidature fields are normalized into a draft record
- clean user-facing and API-facing errors exist when the URL is invalid, unreachable, or yields unusable content

## Explicitly Out of Scope

- manual text fallback and PDF fallback (`US-019`)
- status pipeline (`US-020`)
- template selection, CV generation, LM generation, ATS scoring, and interview enrichment
- recruiter-contact discovery and dashboard KPIs

## Testable Acceptance Mapping

1. `Une offre peut etre ingeree depuis une URL`
   Evidence can be a protected app form plus an API endpoint that accepts `http`/`https` URLs and creates a draft candidature.
2. `Les champs utiles a la candidature sont extraits`
   Evidence can be a returned draft containing structured offer fields such as title, company, location, contract, summary, responsibilities, and requirements.
3. `Les erreurs d'extraction sont gerees proprement`
   Evidence can be explicit validation and extraction errors surfaced with stable messages instead of uncaught exceptions or empty success responses.

## Product Decisions

- Persist a minimal draft candidature now, because a pure transient preview would not satisfy the "creer une candidature" wording well enough.
- Reuse the compliant OpenRouter client for structured field extraction after HTML-to-text normalization.
- Accept a heuristic-only HTML normalization layer before AI extraction to avoid adding a new parsing dependency or ADR.

## Missing Product Questions

- None blocking for this sprint slice.
- The richer company-enrichment phase from vision `§7.3` remains for later stories.
