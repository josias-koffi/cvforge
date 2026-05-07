# Stage 2 — Design: US-065

Agent: designer | Date: 2026-05-07

## Design decision: no UI changes

US-065 is entirely server-side. The frontend already renders the transcript from `session.chunks`. No new UI component or visual change is needed.

## Data model changes

### New type: `InterviewMessage` (in `@cvforge/types`)
```ts
export interface InterviewMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
```

### `InterviewSessionSummary` extension
Add `messages: InterviewMessage[]` field.

## Service behavior design

### `startSession` → `messages: []`

### `transcribeChunk` (on success)
After appending to `session.chunks` and rebuilding `session.transcript`, also append:
```ts
{ role: "user", content: transcript, timestamp: nowIso() }
```

### `streamAIResponse` — conversation build
Replace the flat `user(transcript)` message with the full `messages` array:
```ts
const MAX_MESSAGES = 20;
const recentMessages = session.messages.slice(-MAX_MESSAGES);
const conversation = [
  { role: "system", content: buildAiPrompt(session.language, session.profile) },
  ...recentMessages.map(m => ({ role: m.role, content: m.content })),
];
```
After AI response, append `{ role: "assistant", content: fullText, timestamp }` to `session.messages`.

### Prefetch short-circuit path
When consuming prefetched question, append the prefetched text as an assistant message (it was already generated from a prior messages context).

### Purge
No change needed — `purgeCompletedBefore` removes the entire session including `messages`.

## UX risk
None — no user-facing change. The only observable effect is that the LLM gives contextually aware responses.
