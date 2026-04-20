# Stage 2 — Design

Agent: `designer`
Verdict: `pass`

## UX Shape

This is a light user-facing flow inside the existing authenticated app shell:

- add a protected `/candidatures` page
- place a single "Importer une offre" form near the top
- keep one field for the offer URL and one primary submit action
- after submission, render either:
  - a success state with the saved draft candidature and extracted fields
  - an inline error state with a plain-language explanation and a retry path

## Accessibility

- The URL field keeps a visible label and `type="url"`
- Success and error summaries are rendered as regular text blocks in document order
- No modal or async-only UI is required for the MVP slice, avoiding focus-management complexity

## Visual Direction

- Reuse the existing "Papier & Crayon" card layout and shell navigation
- Keep the page information-dense but vertically structured: import form first, draft list second
- Show extracted fields in simple definition-list or list-card groupings, not a dense table, because the page is still a creation workflow rather than the later pipeline screen

## Non-UI Notes For Handoff

- Use a Next route handler to forward the form POST to the Nest API while preserving the session cookie
- Redirect back to `/candidatures` with a success or error query flag so the server component can render deterministic states without client-side state management
- The API should distinguish invalid URL, fetch failure, and unusable extraction failures to support clean copy on the page
