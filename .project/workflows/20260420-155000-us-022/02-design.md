# Design

## Admin Surface
- Left rail: template library, status chips, duplicate action, and admin context.
- Main panel: creation form, editable template form, and live preview rendered from the shared block registry.
- Editing uses JSON layout text plus structured fields so the template payload stays explicit and serializable.

## Persistence Design
- API owns a dedicated templates store with `templates-state.json`.
- Records keep:
  - template identity and kind
  - visibility and default flags
  - locale and category tags
  - JSON layout blocks
  - timestamps
- Seeded CV ATS and LM ATS templates bootstrap the workflow on first read.

## UX Risks
- The editor is not a full drag-and-drop Puck dependency; it is a Puck-compatible admin studio built around the shared block contract.
- Kind changes on edit are intentionally not part of the workflow to preserve the one-default-per-kind invariant.
