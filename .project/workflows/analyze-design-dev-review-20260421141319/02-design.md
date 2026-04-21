# Stage 2 — Design

## Decision

Non-UI skip. The story is infrastructure-first and does not introduce a new user-facing surface yet.

## Technical shape

- Add a dedicated `credits` API module instead of embedding ledger logic into auth or applications storage.
- Persist append-only ledger entries in a separate file-backed store for clear event history.
- Expose:
  - `GET /credits/me`
  - `GET /credits/users/:userEmail` for admins
  - `POST /credits/admin/grants` for manual bootstrap/compensation
- Reuse shared `@cvforge/types` constants for action identifiers and credit costs.

## UX risk

None in this story. The UI consumption of these APIs is intentionally deferred to `US-031`.

## Pass Verdict

The non-UI design path fits the analyzed scope and keeps the future Stripe/user-dashboard stories aligned on one ledger model.
