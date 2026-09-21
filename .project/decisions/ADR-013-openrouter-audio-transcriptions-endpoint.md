# ADR-013: Speech-to-text through OpenRouter's dedicated transcription endpoint, with a fallback chain we walk ourselves

Date: 2026-09-21
Status: accepted

## Context

Interview speech-to-text went through `POST /chat/completions` with an
`input_audio` part, pinned to `mistralai/voxtral-small-24b-2507`. Three things
were wrong with that, and together they are why the interview mode never worked
reliably end to end.

**It truncated.** `transcribeChunk` capped the reply at `max_tokens: 64` (the
service default was 48). A French answer of more than roughly ten seconds does
not fit in 64 tokens, so the transcript was cut mid-sentence — silently, with no
error and no warning. The conversation then carried on against a half-recorded
answer.

**It had nowhere to fall back to.** The request set `pinModel: true` and
`provider: { order: ["mistral"], allow_fallbacks: false }`, because Voxtral is
served by Mistral alone and only that route accepts `input_audio`. This is the
single-provider trap that commits `87e934f`, `e08dcb1` and `62dbd0b` spent three
rounds removing from the chat path. Speech-to-text never got the same treatment.

**Worse, on our account that route does not exist.** Probing the catalogue on
2026-09-21 showed OpenRouter rejecting `mistralai/voxtral-mini-transcribe` and
`qwen/qwen3-asr-flash` outright:

```
404 — 0 endpoints out of 1 requested are available matching your guardrail
restrictions and data policy … ZDR violation (account settings)
```

That is an **account-level** privacy rule. `ENABLE_ZDR_STT=false` does not
relax it — that flag only controls the per-request `data_collection: "deny"`
filter. The same settings also exclude every first-party OpenAI transcription
model, Deepgram, NVIDIA Parakeet, Grok and Fish Audio ("No allowed providers").
So a chain naming those models fails closed, at runtime, with a 404 that looks
like a missing model.

Meanwhile OpenRouter has shipped a **dedicated transcription endpoint**,
`POST /api/v1/audio/transcriptions`, which takes `{model, input_audio:{data,
format}, language}` and returns `{text, usage}` — no token budget, no JSON
schema, no chat wrapper.

## Decision

- Transcribe through **`POST /api/v1/audio/transcriptions`**, not
  `/chat/completions`. The response is plain text, so `max_tokens`, the
  `transcription_result` JSON schema and the parse-or-throw step all disappear
  along with the truncation bug.
- **Walk the model chain ourselves**, in `runModelChain` shared with the chat
  path. This is not a preference: the endpoint documents that per-request
  routing controls — `models[]`, `order`, `allow_fallbacks` — *are not applied*.
  Any failover has to be ours.
- Default chain, every entry verified reachable under this account's privacy
  settings, each on a different provider family:

  | Rank | Model | $/h of audio | Family |
  |---|---|---|---|
  | 1 | `openai/whisper-large-v3-turbo` | 0.012 | OpenAI weights, third-party host |
  | 2 | `mistralai/voxtral-mini-3b-2507` | 0.060 | Mistral |
  | 3 | `nvidia/nemotron-3.5-asr-streaming-multilingual-0.6b` | 0.012 | NVIDIA |

  Overridable with `INTERVIEW_STT_MODEL` and `INTERVIEW_STT_FALLBACK_MODELS`
  (CSV; blank means the defaults, the literal `none` opts out), matching the
  convention `OPENROUTER_FALLBACK_MODELS` already set.
- **An empty transcript is not an error.** The old code threw on blank text;
  combined with a VAD that trips on a keyboard, that pushed whole sessions into
  `status: "error"` over a cough. A blank result now yields an empty chunk and
  the conversation simply does not advance.
- **`INTERVIEW_AI_MODEL` is removed**, not repointed. It defaulted to
  `mistralai/mistral-small-2603`, the Mistral-only model `87e934f` abandoned for
  having no route. Interview chat uses `OPENROUTER_MODEL` and its fallback chain
  like the rest of the application; a dedicated override only rebuilds the
  single point of failure.

## Consequences

- Transcription costs a fifteenth of what it did: **$0.012/h against $0.18/h**.
  For a ten-minute interview that is ~€0.002 of speech-to-text instead of
  ~€0.030, which changes the credit maths for the feature.
- Answers longer than ten seconds transcribe in full. This is the fix.
- A throttled or failing provider no longer ends the interview — the chain
  bascule is ours, observable, and covered by tests.
- We now maintain that bascule by hand for two endpoints. `runModelChain` is
  shared, so the retry and skip semantics cannot drift apart.
- The chain is tied to this account's privacy configuration. **Loosening or
  tightening the ZDR setting at
  <https://openrouter.ai/settings/privacy> changes which models resolve**, and
  the defaults here must be re-probed if it is touched.
- `mistralai/voxtral-small-24b-2507-stt` does resolve and is the closest thing
  to the previous behaviour, but at $0.18/h it is the most expensive reachable
  option. It is not in the chain.

### What this ADR does not establish

Price, latency and reachability were measured. **French transcription quality
was not**: the probe clip was a short English test tone repeated to length, so
it exercises the contract, not the accuracy. Whisper Large v3 and Voxtral are
both well-documented multilingual models and French is a first-class language
for each, but the ordering must be confirmed against a real French answer
during end-to-end verification. If Whisper Turbo disappoints in French,
promoting `mistralai/voxtral-mini-3b-2507` is a one-line environment change.

## Alternatives considered

- **Keep `/chat/completions`, just raise `max_tokens`.** Rejected: it leaves the
  pinned single provider, the JSON schema and the parse-or-throw in place, and
  on this account the pinned model is unroutable anyway.
- **Let OpenRouter fail over with a `models[]` array.** Not available: the
  transcription endpoint ignores routing controls. It is also the mechanism that
  already failed silently in production for chat (`62dbd0b`).
- **Deepgram or a self-hosted Whisper.** Rejected: a new vendor or new
  infrastructure, its own ADR, its own secret and its own uptime — for a
  capability the existing gateway serves at $0.012/h.
