# Stage 2 — Design

## Verdict

Pass

## UX / Domain Shape

This story is not a full dashboard redesign. It adds a status-management layer
to the existing `/candidatures` flow and exposes KPI-ready summary data to the
existing `/dashboard`.

## Proposed Design

- Shared domain contract in `@cvforge/types`
  - canonical status values
  - allowed transitions
  - status history entry shape
  - KPI summary shape
- API responsibilities
  - create new applications with initial `draft` status history
  - update statuses through one explicit transition endpoint
  - reject invalid or backward transitions
  - compute dashboard summary from stored applications
- App responsibilities
  - show the current status on each candidature card
  - render only the next allowed manual transitions as buttons
  - display timestamped history for traceability
  - show simple KPI cards on `/dashboard` using the summary endpoint

## Transition Rules

- `draft` -> `sent`
- `sent` -> `interview_scheduled`, `rejected`, `offer_received`
- `interview_scheduled` -> `rejected`, `offer_received`
- `rejected` -> terminal
- `offer_received` -> terminal

## KPI Scope

The dashboard summary for this story includes:

- total applications
- counts per status
- response rate derived from statuses that imply employer feedback

This satisfies the sprint requirement without inventing the later full charting
or ATS KPI work from the vision.

## UX Risks

- Too many status controls could create accidental regressions.
  Mitigation: only render allowed next transitions, never free-form selection.
- KPI wording can be ambiguous this early.
  Mitigation: expose raw status counts alongside the computed response rate.
