# Stage 1 — Analyze (Product Owner)

## Task scope
US-045 extends the interview studio built in US-044 with an LLM→TTS pipeline. The candidate's transcript (captured via STT in US-044) triggers an AI interviewer response that is both streamed as text and spoken via TTS before the full generation is complete.

## Acceptance criteria — testability check
1. **La voix IA est générée via Voxtral TTS** — testable: an AI-generated audio response plays in the browser after the candidate finishes speaking. For MVP, browser-native SpeechSynthesis replaces a dedicated Voxtral TTS endpoint (no OpenRouter TTS API available for Voxtral; using SpeechSynthesis avoids a new dependency/ADR).
2. **Le premier chunk audio arrive avant la fin de génération complète** — testable: SSE streaming delivers text chunks incrementally; each sentence is spoken as it arrives rather than after the full response is buffered.
3. **Le pipeline complet est observable** — testable: structured log events at each stage (transcript received, LLM chunk received, audio utterance started/ended) plus client-side status badges.

## Scope boundary
- In: LLM streaming from OpenRouter (new `stream: true` path), SSE endpoint on the API, SpeechSynthesis playback in the studio client, pipeline observability.
- Out: Voxtral TTS server-side synthesis (no OpenRouter TTS endpoint for Voxtral today; Web Speech API is sufficient for the sprint goal), credit deduction for AI response generation (deferred).

## Missing product questions
None blocking. The interview AI persona (coach/interviewer) is implicit from vision §10. The exact LLM model defaults to the existing OpenRouter default.

## Pass verdict: SCOPE CLEAR
