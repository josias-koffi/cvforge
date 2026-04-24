# Stage 3 — Implement (Developer)

## Summary
US-045 LLM→TTS streaming pipeline implemented across 8 files.

## Files changed

### packages/types/src/index.ts
- Added `INTERVIEW_AI_STATUS_*` constants (idle/generating/done/error)
- Added `InterviewAIStatus` type
- Added `InterviewAIResponseEvent` interface (chunk/done/error SSE events)
- Extended `InterviewSessionSummary` with `aiResponse`, `aiResponseGeneratedAt`, `aiStatus`

### apps/api/src/ai/openrouter.service.ts
- Added `streamChat()` async generator: calls `/chat/completions` with `stream: true`, parses SSE lines, yields delta strings

### apps/api/src/interview/interview.types.ts
- `summarizeInterviewSession()` now includes the three new AI fields

### apps/api/src/interview/interview.store.ts
- `normalizeSession()` migrates existing sessions (defaults `aiStatus: "idle"`, null `aiResponse`/`aiResponseGeneratedAt`)

### apps/api/src/interview/interview.service.ts
- Added `INTERVIEWER_SYSTEM_PROMPT` constant
- `startSession()` initializes AI fields
- Added `streamAIResponse()` async generator: guards on empty transcript, marks session `generating`, streams LLM via `streamChat()`, yields `InterviewAIResponseEvent` chunks, persists completed response, handles errors

### apps/api/src/interview/interview.controller.ts
- Added `@Sse('sessions/:sessionId/respond')` endpoint using RxJS `Observable<MessageEvent>` wrapping the async generator

### apps/app/app/interview/[sessionId]/respond/route.ts (new)
- GET proxy that forwards SSE stream with `text/event-stream` headers and disables buffering

### apps/app/app/interview/interview-studio.tsx
- Added `AIState`, `PipelineEvent` types
- Added `aiState`, `aiText`, `pipelineEvents` state, `utteranceQueueRef`, `speakingRef`
- Added `addPipelineEvent()`, `speakNext()` (Web SpeechSynthesis queue), `streamAIResponse()` (SSE client, sentence-boundary TTS trigger)
- Added AI Response card with status badge, text area, "Generate AI Response" button (enabled only when `session.status === "ready"`), observable pipeline event log

## Quality gates
- `pnpm test`: 219 API + 196 app + 10 types = all passed
- `pnpm lint`: 6/6 tasks passed, 0 warnings
- `pnpm build`: 6/6 tasks passed (Next app + API + packages)
- New-code coverage: 7 new tests added (2 streamChat, 3 streamAIResponse, 2 respond proxy route)

## Coverage impact
All new paths covered by targeted tests. No coverage regression.
