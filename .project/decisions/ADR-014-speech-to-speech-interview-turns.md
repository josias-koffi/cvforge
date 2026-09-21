# ADR-014: One speech-to-speech call per interview turn, streamed over POST

Date: 2026-09-21
Status: accepted

## Context

A spoken turn used to cost three sequential round trips: transcribe the
candidate's audio, send the text to a chat model, then read the reply aloud with
the browser's `speechSynthesis`. Measured end to end that came to six to eight
seconds of silence between the candidate finishing a sentence and hearing a
reply. The backlog target for the loop is **1.2 s perceived** (US-047, epic
E12), so the pipeline was off by a factor of five.

Each stage also had its own failure mode. Transcription could truncate or fail
outright (see ADR-013). `speechSynthesis` is capricious: Chrome cuts off around
fifteen seconds, Safari needs a user gesture, and the voice is a synthesiser
rather than a person.

Audio-native models changed what is available. `openai/gpt-audio-mini` takes the
candidate's recording in and streams spoken audio out in one call, with the
transcript of its own reply alongside.

## Decision

**One call per turn.** The candidate's WAV goes up as `input_audio`; PCM16 comes
back over SSE and plays as it arrives. Transcription still runs, but *beside* the
voice rather than in front of it — the report is built from the candidate's own
words (hesitations, keyword coverage, pacing), and nothing is waiting on it.

Measured on a French turn, 2026-09-21:

| model | first audio | cost/turn |
|---|---|---|
| `openai/gpt-audio-mini` | 1129 ms | $0.00044 |
| `openai/gpt-audio` | 751 ms | $0.00822 |

The mini leads the chain: nineteen times cheaper for 378 ms more, which keeps a
session at roughly half a euro cent. `gpt-audio` is the fallback. Both need the
`openai` provider enabled in the account's allowed-providers list.

**Streamed over POST, not `@Sse`.** Nest's `@Sse` decorator maps GET only — it
targets the browser's `EventSource`, which cannot carry a body. A recorded answer
is around a megabyte of base64 and has to travel in one. The controller therefore
writes the event stream by hand and the browser reads it with `fetch` and a
`ReadableStream`, which POSTs happily. Frames are flushed as they are produced,
so the voice starts playing while the rest is still being generated.

**The recruiter speaks first.** A silent microphone told the candidate nothing
about what was expected. The opening greeting is the same speech-to-speech call
with a text instruction in place of the audio that does not exist yet. It is
idempotent on sessions that already have messages, so a page reload does not
produce a second greeting.

### Divergence from the vision, for the owner to arbitrate

Vision §10.2 specifies a "stack vocale 100 % Mistral" — Voxtral Small for STT,
Mistral Small 4 for the LLM, Voxtral TTS for speech — and §10.3 prescribes two
critical optimisations built around it: piping LLM output into TTS sentence by
sentence, and streaming STT while the candidate is still speaking.

**Neither optimisation applies any more**: there is no separate TTS stage to
pipe into, and no STT on the critical path to stream. They were the right
answers to a three-stage pipeline. The target they served — 1.2 s perceived —
is unchanged and still the one we measure against.

Voxtral TTS was also never reachable: §10.2 itself flags it as "pas encore
disponible via OpenRouter (à vérifier)", and probing on 2026-09-21 found the
Voxtral transcription models returning `404 — ZDR violation (account
settings)` on this account (ADR-013). `vision.md` is not edited by agents, so
§10.2/§10.3 stand as written until the owner revises them.

## Consequences

- The transcribe/chat/speak path is deleted, not kept beside this one:
  `/chunks`, `/prefetch`, `/respond`, their Next proxies, and the browser TTS
  hook. Roughly 900 lines.
- `speechSynthesis` is gone, and with it its browser-specific failures.
- **No barge-in.** OpenRouter is request/response with no bidirectional socket,
  so the candidate cannot interrupt the interviewer mid-sentence. A real
  interruption needs a realtime API (Gemini Live, or OpenAI's realtime
  endpoint) and is a separate decision.
- The microphone must stay shut while the reply plays, or the speakers feed the
  recruiter back into the recording. The studio reopens it 350 ms after the
  last scheduled sample, not when the text stream ends.
- Retries are bounded separately from the rest of the app (ADR-016): a turn has
  about a second of budget, so it fails over to the next model rather than
  waiting out a throttle.
