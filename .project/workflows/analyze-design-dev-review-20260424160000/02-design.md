# Stage 2 — Design (Designer)

## UX decisions

### Pipeline design
`candidate speaks → STT (US-044) → transcript ready → "Generate AI Response" CTA → SSE stream from API → sentence-by-sentence SpeechSynthesis → observable pipeline card`

### Studio additions
1. **AI Response card** — appears below the transcription card. Contains:
   - Status badge: `idle | generating | speaking | done | error`
   - Text area showing the accumulated AI response text (real-time as SSE arrives)
   - "Generate AI Response" button (enabled only when `session.status === "ready"`)
   - Sentence counter showing how many utterances have been spoken
2. **Observable pipeline row** — below the text area, a compact list of pipeline events with timestamps (LLM chunk received, audio utterance started/ended).
3. No new routes or page — everything stays in `InterviewStudio`.

### SSE event shape
```
event: chunk
data: { "type": "chunk", "text": "...", "index": 0 }

event: done
data: { "type": "done", "fullText": "..." }

event: error
data: { "type": "error", "message": "..." }
```

### Accessibility
- Status changes announced via `role="status"` or `role="alert"` on the message box.
- Buttons clearly labelled; disabled state communicated via `aria-disabled`.

## Non-UI decisions
- The SSE proxy route in Next.js must forward the `text/event-stream` content type and disable body buffering.
- NestJS `@Sse()` decorator returns `Observable<MessageEvent>` using RxJS (already in deps).
- No new library = no ADR required.

## Pass verdict: DESIGN FITS SCOPE
