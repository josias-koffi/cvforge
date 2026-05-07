# Stage 3 — Implement: US-065

Agent: developer | Date: 2026-05-07

## Changes delivered

### `packages/types/src/index.ts`
- Added `InterviewMessage { role, content, timestamp }` interface
- Added `messages: InterviewMessage[]` field to `InterviewSessionSummary`

### `apps/api/src/interview/interview.types.ts`
- Imported `InterviewMessage`
- Added `messages` to `summarizeInterviewSession()` return
- Added `normalizeMessages()` for store deserialization

### `apps/api/src/interview/interview.store.ts`
- Imported `normalizeMessages`
- Called `normalizeMessages(session.messages)` in `normalizeSession()`

### `apps/api/src/interview/interview.service.ts`
- Added `MAX_MESSAGES = 20` constant
- Added `appendMessage()` helper (enforces MAX_MESSAGES cap, drops oldest)
- Added `buildConversation()` private method: `[system, ...recentMessages]`
- `startSession()`: initializes `messages: []`
- `transcribeChunk()` (success path): appends `{ role: "user", content: transcript }` after each STT result
- `streamAIResponse()`: uses `buildConversation()` instead of flat user-transcript message; appends `{ role: "assistant", content: fullText }` after generation; same for prefetch short-circuit path
- `prefetchNextQuestion()`: uses `buildConversation()` for consistent context

### Test fixes (missing `messages` field)
- `packages/types/src/index.test.ts` — 2 session objects updated
- `apps/api/src/interview/interview-purge.service.test.ts` — `makeSession()` updated
- `apps/api/src/interview/interview.controller.test.ts` — `SESSION_SUMMARY` updated

### New tests (`interview.service.test.ts`)
4 new tests covering all AC behaviors:
1. `initialises session with an empty messages array`
2. `appends a user message to messages[] after each transcribed chunk`
3. `sends the full messages[] to the LLM on each AI turn (no context reset)` — 3-exchange test
4. `appends assistant message to messages[] after AI response`

## Gates
- `pnpm --filter @cvforge/api test --run` — 247 tests passed
- `pnpm --filter @cvforge/types test --run` — 12 tests passed
- `pnpm --filter @cvforge/app test --run` — 271 tests passed
- `pnpm lint` — 6/6 tasks passed
- `pnpm build` — 6/6 tasks passed
