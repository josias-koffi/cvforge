# Stage 2 — Design

## Verdict
Pass

## Proposed UX
- Desktop: split view with an editable document form on the left and a live document preview on the right.
- Mobile: hide the editor form and show the preview only, with a clear read-only notice.
- Save action: one explicit persistence control that writes the edited `cvContent` back to the API.

## Risks
- The editor is schema-driven rather than a full drag-and-drop Puck canvas, so it should stay aligned with the shared document block contract.
- The preview must remain the same document model used by PDF export so later export work can consume the edited content without translation.

