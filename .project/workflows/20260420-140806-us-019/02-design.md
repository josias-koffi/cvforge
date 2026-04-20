# Stage 2 — Design

Agent: `designer`
Verdict: `pass`

## UX Shape

The protected `/candidatures` page remains the single ingestion surface, but it now exposes two explicit inputs:

- the existing URL field for scraping-first import
- a multiline text area for pasted offer content when scraping fails or no URL exists

Both inputs should stay inside the same top card so the user understands they are alternative ways to create the same draft candidature.

## Accessibility

- Keep visible labels for both the URL field and the pasted-text field
- Keep the text fallback as a native `<textarea>` in document order
- Reuse the same inline success and error blocks so status messaging stays readable without client-side state

## Visual Direction

- Preserve the current "Papier & Crayon" card layout and vertical rhythm
- Present the text fallback as a secondary section under the URL form, separated by explanatory copy instead of tabs or hidden panels
- Add a short note that PDF import is not yet available in MVP, so the fallback order is explicit: URL first, pasted text second

## Non-UI Notes For Handoff

- The Next route handler can branch on a hidden `sourceType` field and forward to the matching API endpoint
- The API should keep stable error categories for invalid URL, unreachable target, and insufficient pasted content
- The PDF decision should be documented in workflow artifacts and surfaced as static page copy, not as a fake disabled upload flow
