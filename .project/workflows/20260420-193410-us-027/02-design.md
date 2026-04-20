# Stage 2 — Design

## Verdict
Pass

## Design
- Add a dedicated API service responsible for PDF generation from stored `cvContent`
- Render the CV as self-contained HTML with the same section structure as the user-facing document
- Post that HTML to Browserless `/pdf` via the existing `PUPPETEER_URL` infrastructure service
- Add a Next route that forwards the authenticated user to the API and streams the PDF bytes back to the browser
- Add an export action to the CV editor so the user can download the PDF from the same document screen

## UX notes
- The export action is secondary to the save action and sits beside the existing editor controls
- The file download route is intentionally opaque to the user; the browser handles the attachment response

## Risks
- If the export HTML drifts from the document preview, PDF fidelity could degrade
- The Browserless service must remain reachable in local and production environments

