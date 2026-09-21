# Interview Practice

A candidate speaks to an AI recruiter, and gets a scored report on what went
well and what did not. `E12`/`E13` built the pipeline, `US-066` finished the
reporting, and this document describes what actually runs.

## The loop

1. `/entretiens/new` — pick a candidature (or free practice), a recruiter
   profile and a language. The credit cost is shown before the click.
2. `/entretiens/[sessionId]` — the studio. Voice detection starts recording
   when the candidate speaks and stops after a pause; there is no
   push-to-talk. Each answer is transcribed, appended to the conversation, and
   answered by the recruiter model, which is spoken aloud sentence by sentence
   as it arrives.
3. `/entretiens/[sessionId]/rapport` — score out of ten, five scored
   dimensions, the advice, the transcript, and the facts counted from it.
4. `/entretiens/progression` — how the scores move across recent sessions,
   and which dimensions recur as strengths or weaknesses.

Recruiter profiles: `standard`, `aggressive`, `passive`, `technical`,
`behavioral`. Languages: French and English.

## Credits

A session costs **2 credits**, charged when it is created — not when it ends.
The cost is committed as soon as the session runs (one transcription and one
chat turn per answer), so charging at the end would let an abandoned tab run
up a bill for free. `finishSession` never touches credits, and nothing is
refunded: a failed turn leaves the session usable, so the candidate can simply
speak again.

A second "Démarrer" within thirty minutes hands back the untouched session
rather than opening — and charging for — a second one.

## Speech to text

Through OpenRouter's dedicated `/audio/transcriptions` endpoint, over a
fallback chain CVForge walks itself (that endpoint applies no routing controls
of its own). See `ADR-013` for the decision and the measurements.

| Rank | Model | $/h of audio |
|---|---|---|
| 1 | `openai/whisper-large-v3-turbo` | 0.012 |
| 2 | `mistralai/voxtral-mini-3b-2507` | 0.060 |
| 3 | `nvidia/nemotron-3.5-asr-streaming-multilingual-0.6b` | 0.012 |

Override with `INTERVIEW_STT_MODEL` and `INTERVIEW_STT_FALLBACK_MODELS` (CSV;
blank means the defaults, the literal `none` disables failover).

**The account's privacy settings decide what resolves at all.** As of
2026-09-21, `mistralai/voxtral-mini-transcribe` and `qwen/qwen3-asr-flash`
return `404 — ZDR violation (account settings)`, as do all first-party OpenAI
transcription models, Deepgram, Parakeet, Grok and Fish Audio. Re-probe the
catalogue before changing the chain, and after any change at
<https://openrouter.ai/settings/privacy>.

The recruiter's replies and the report use the shared chat chain
(`OPENROUTER_MODEL` plus its fallbacks), like the rest of the application.

## Text to speech

The browser's own `speechSynthesis`. There is no TTS provider and no audio is
generated server-side. It is uneven across browsers — Chrome cuts off after
roughly fifteen seconds, Safari wants a user gesture first — so the turn never
depends on it: when it is missing or fails, the reply is still there to read.

## Audio and retention

**Recorded audio is never persisted.** Segments are re-encoded to 16 kHz mono
WAV in the browser, uploaded, transcribed, and dropped; only the text is
stored. That is why the report has no playback control.

Sessions and their transcript segments are purged 30 days after completion
(`InterviewPurgeService`), and removed immediately on account deletion
(`US-092`). See `docs/privacy-retention-policy.md`.

## Shape of the code

- `apps/api/src/interview/` — session orchestration, prompts, the scored
  report, transcript statistics, and the progress aggregation (a pure
  function: the metrics live in a `jsonb` column)
- `apps/api/src/ai/openrouter-transcription.service.ts` — speech to text
- `apps/web/lib/interview/` — the studio's logic with no React in it: WAV
  encoding, voice detection, SSE parsing, sentence draining, and the reducer
  that holds every state transition
- `apps/web/hooks/interview/` — the browser plumbing over those modules
- `apps/web/app/api/interviews/` — BFF route handlers; the session cookie is
  httpOnly, so the studio cannot call the API directly

## Known limits

- French transcription accuracy has not been measured against a reference —
  price, latency and reachability have. If Whisper Turbo disappoints in
  French, promoting `mistralai/voxtral-mini-3b-2507` is an environment change.
- There is no replay: without stored audio, a candidate cannot listen back.
- The progress window is the last ten finished sessions, which the 30-day
  retention effectively caps anyway.
