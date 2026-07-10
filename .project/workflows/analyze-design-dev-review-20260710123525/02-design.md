---
tags: [workflow/stage, workflow/analyze-design-dev-review, stage/design]
parent: "[[task]]"
agent: "[[../../../agent-setup/agents/designer/agent|designer]]"
prev: "[[01-analyze]]"
next: "[[03-implement]]"
---
# Stage 2 — Design (designer)

## Layout
Single "Fil d'activité" card stays the primary surface, but its body is restructured:

1. **Header row** (unchanged position, tightened): title + unread count, count wrapped in a `role="status"` span with `aria-live="polite"` so assistive tech announces changes after a mark-as-read action without a full page reannounce.
2. **Day sections** inside the card body, in order: `Aujourd'hui` → `Hier` → `Plus ancien`. A section with zero items is omitted entirely (no empty "Aujourd'hui" heading). Section heading: small caps label (`textMuted`, `0.8rem`, letter-spacing), not a full `CardHeader` — these are sub-groups, not new cards.
3. **Within each section**: unread first (existing pastille `Badge variant="success"` kept), then read, each ordered by `createdAt` descending inside its readAt-partition. Existing `article` row markup is reused as-is (border, radius, padding) — no new visual language.
4. **Préférences email card** moves from its current position (between KPI row and Fil d'activité) to *after* the Fil d'activité card, and is densified: the two checkbox rows collapse onto one line each (label + helper text inline via `flex` instead of stacked `span`s), removing the vertical helper-text line to shrink the card's footprint since this is now a footer utility, not a primary surface.

## Accessibility
- `aria-live="polite"` region wraps only the unread-count `<strong>`, not the whole KPI card (avoids over-announcing unrelated KPI content).
- Day-section headings use `<h3>` (the card already has an `<h2>`-equivalent `CardTitle`), preserving heading order.
- Focus rings: no new interactive element beyond what already exists (`Ouvrir l'élément lié`, `Marquer comme lue`, checkboxes, submit button) — all already inherit visible focus from `@cvforge/ui` primitives, verify unchanged in implementation.
- Contrast: section-heading `textMuted` on `canvas` already verified at 4.6:1 AA (per shared design-system tokens) — reused, not redefined.

## Tokens
No new tokens. Reuses `Card`/`CardHeader`/`CardTitle`/`CardContent`/`Badge`/`Button` from `@cvforge/ui` and the existing inline `#6B6860` / `#D9D3C7` values already present in this file (consistent with the rest of the page, which does not yet use the `textMuted`/`border` named exports — out of scope to migrate that in this task).

## Non-UI decisions
None — this is a visual/structural change only.

## Pass
- Design fits the analyzed scope (reorder/regroup + reposition, no new surfaces).
- UX risk: grouping must not visually separate an unread item from its read neighbours in a confusing way — mitigated by keeping the unread badge visible regardless of which day-section it lands in.
