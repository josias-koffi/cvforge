# Stage 1 — Analyze

## Scope

`US-029` is limited to the backend credit ledger and the debit rules for the AI actions that already exist in the MVP:

- offer enrichment during candidature import
- CV generation
- letter generation

## Acceptance mapping

1. Traceable balance requires immutable ledger entries with `amount`, `balanceAfter`, timestamp, and user identity.
2. Expected AI consumption requires central pricing constants and enforced debits inside the existing OpenRouter-backed flows.
3. User/admin-exploitable history requires authenticated read APIs for the current user and privileged read/grant APIs for admins.

## Product gaps

- `US-030` will connect Stripe purchases to the same ledger.
- `US-031` will consume the new credit APIs to render the "Mes credits" page.

## Pass Verdict

Scope is clear, acceptance criteria are testable, and no missing product blocker remains for this story.
