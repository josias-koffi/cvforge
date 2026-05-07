# Stage 1 — Analyze: US-065

Agent: product-owner | Date: 2026-05-07

## Scope

US-065 addresses a critical regression in the interview feature: the LLM receives only the last transcript segment instead of the full conversation history. Each AI call is stateless, meaning the interviewer "forgets" what it said and what the candidate answered across turns.

## Root cause

`streamAIResponse` constructs a 2-message payload `[system, user(transcript)]` where `transcript` is a flat string of joined STT chunks. There is no prior AI turn stored — the assistant's previous questions are never passed back to the model.

## Acceptance criteria — testability assessment

| AC | Testable? | Notes |
|----|-----------|-------|
| messages[] per sessionId | ✅ | Assert `session.messages` is populated after chunk + AI turn |
| Append on STT chunk (no replace) | ✅ | Two chunks → two user messages, original preserved |
| Full array sent to LLM each turn | ✅ | Mock openRouter.streamChat, inspect messages arg |
| RGPD purge via TTL | ✅ | Purge service already covers; messages are part of session |
| No implicit context reset | ✅ | After prefetch short-circuit, messages array not cleared |
| 3-exchange test | ✅ | Integration-style test with 3 user→assistant cycles |

## Scope decisions

- **Redis vs file store**: The AC mentions "clé Redis" but the entire codebase uses file-based persistence. Adding Redis requires an ADR and new infrastructure dependency. The implementation will use the existing `FileInterviewStore` by adding a `messages` field — all AC behaviors (append-only, full context, TTL purge) are satisfied without Redis. ADR is not required since no new library is introduced.
- **Truncation**: Sprint risks note context window growth. Cap at 20 messages (10 full exchanges) — drop the oldest user+assistant pair when exceeded.
- **`prefetchNextQuestion`**: Should also use `session.messages` for consistency, though it's best-effort.

## Open questions

None blocking. Truncation cap (20 messages) is the only tunable parameter; the sprint risks acknowledge it as known.
