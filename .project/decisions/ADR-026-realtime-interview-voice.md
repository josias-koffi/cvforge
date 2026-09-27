# ADR-026: The interview voice moves to OpenAI Realtime over WebRTC, off OpenRouter

Date: 2026-09-25
Status: accepted

Supersedes the voice parts of ADR-014 (one speech-to-speech call per turn),
ADR-018 (client-side barge-in), ADR-019 (answer streamed up in pieces) and
ADR-020 (VAD silence budget). ADR-013 (transcription through OpenRouter) no
longer applies to the interview. Text features stay on OpenRouter.

## Context

The product owner judged the interview unusable: the recruiter could not
really be interrupted, and the wait before each reply was too long.

The code confirmed both points:

- **Barge-in stopped only the speakers.** The Next proxy did not forward the
  abort, Nest never noticed the disconnect, and the OpenRouter stream kept
  generating and billing. The model never learnt it had been cut off: its
  history held a sentence the candidate never heard.
- **Most of the wait came before any request.** The client VAD waited 1.8 to
  3.5 s of silence (ADR-020). Then came about 1.1 s to first audio
  (`firstAudioMs` p50 1323 ms, p90 2458 ms on staging), a 160 to 420 ms jitter
  buffer and four network hops.

ADR-018 set conditions for revisiting a realtime API, and they are now met. The
remaining reason it gave was semantic turn detection, which is what fixes the
silence budget.

### Options compared (list prices of 2026-09-25)

| | OpenAI `gpt-realtime-2.1-mini` | Mistral cascade (Voxtral Realtime → LLM → Voxtral TTS) | OpenAI `gpt-realtime-2.1` |
|---|---|---|---|
| Barge-in | Native, server-side, reply truncated where it was heard | To build | Native |
| End of turn | Semantic VAD | Silence VAD | Semantic VAD |
| After end of speech | ~0.3–0.6 s | ~0.8–1.2 s | ~0.3–0.5 s |
| French voice | Conversational, sometimes slightly anglophone | Best timbre | Best conversational |
| 10 min | ~$0.15–0.30 | ~$0.08–0.12 | ~$0.50–1.00 |
| Data | US | EU | US |

Ten minutes are sold for 10 credits, which is €0.34 (Intensif) to €0.66
(Essentiel). The full model does not fit that price; the mini does, with a
45–75 % margin.

## Decision

**The mini model, over WebRTC, straight between the browser and OpenAI.** The
product owner accepts that interview audio is processed in the US (a gap with
vision §15.2). Zero data retention (ZDR) must be requested from OpenAI.

- **Handshake through our API (the "unified interface").**
  1. The browser posts its SDP offer to `POST /interviews/sessions/:id/realtime`.
  2. Nest sends it to `POST /v1/realtime/calls` as multipart. The multipart
     carries the session: model, voice, brief, `semantic_vad`, transcription.
  3. Nest returns OpenAI's SDP answer.
  4. The API key and the prompt never reach the page, and the call id comes
     back in `Location`.
- **Sideband.** Nest joins the same call on `wss://…/realtime?call_id=` (Node's
  own WebSocket, key in a header). `InterviewCall` then:
  - records the conversation in order for the report. The candidate's
    transcript often lands after the reply, so items are held in conversation
    order and written once everything before them is known;
  - sends `session.update` with the agenda after every reply;
  - hangs up once the goodbye has played (`output_audio_buffer.stopped`, with
    a 15 s fallback) or when the paid duration plus 90 s is spent.
- **Reconnection.** A second call on the same session ends the first. The
  conversation so far is replayed as text items, with an instruction not to
  greet again.
- **Cost.** Every `response.done` is priced from its `usage` (fresh and cached
  input apart, audio and text apart). It is filed in the AI cockpit as
  `interview_voice` and logged per call (`interview.call … costUsd=`). Credits
  are unchanged: charged at creation.
- **Client.** `useRealtimeCall` replaces the microphone worklet, the VAD, the
  PCM player, the jitter buffer and the SSE client. The studio reducer now
  follows the data channel's events.

## Consequences

- The candidate can interrupt at any point: generation stops server-side and
  the history matches what they heard.
- The fixed silence budget is gone. Latency is measured from the end of speech
  to `output_audio_buffer.started`.
- One call per process. The sideband lives on the replica that opened the
  call, as the answer buffer of ADR-019 did.
- A new secret: `OPENAI_API_KEY` in both environments (deploy, Terraform,
  `set-secrets.sh`).
- No automatic fallback to another model: OpenRouter's chain no longer covers
  the voice. A refused call shows "Le recruteur est injoignable" with a
  "Reprendre l'appel" button.
- Text features (CVs, letters, report, ATS) stay on OpenRouter; that is the
  product owner's decision.

## To check in staging

- Barge-in in the middle of a sentence: the recruiter stops within 300 ms and
  takes the interruption into account.
- End of speech to first audio, p50 under 800 ms.
- Actual cost of a 10-minute session from `interview.call … costUsd`, target
  under $0.30. The mini's cached prices in `openai-realtime.pricing.ts` are
  estimates to correct against the invoice.
