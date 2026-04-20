# Stage 1 — Analyze

## Verdict

Pass

## Scope

`US-020` extends the existing draft-only candidature slice created in `US-018`
and `US-019` into a real status pipeline aligned with the vision.

## Acceptance Mapping

1. `Les statuts du pipeline sont implémentés`
   Requires a shared status contract used by the API and app, replacing the
   current single `draft` value.
2. `Les transitions métier sont définies`
   Requires explicit allowed transitions in code, not ad hoc UI labels.
3. `Le statut alimente les futurs KPI dashboard`
   Requires a KPI-ready aggregate based on current statuses and surfaced to the
   dashboard contract.

## Product Decisions Anchored To The Vision

- Status set:
  `draft`, `sent`, `interview_scheduled`, `rejected`, `offer_received`
- Transition ownership:
  manual by the user
- History:
  each status change stores a timestamp
- KPI-ready scope for this story:
  total applications, counts per status, response rate excluding drafts

## Missing Product Questions

None blocking for MVP. The vision does not define reversal or reopen flows, so
this implementation should keep terminal statuses final and avoid inventing
backward transitions.
