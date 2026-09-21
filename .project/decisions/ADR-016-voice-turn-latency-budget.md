# ADR-016: A voice turn gets its own retry budget, and every turn says what it did

Date: 2026-09-21
Status: accepted

## Context

The first live interview produced replies anywhere between 1.9 s and 6.4 s
against a 1.2 s target (US-047), with no way to tell why. Reading the code found
three causes and one absence.

**`Retry-After` was obeyed verbatim.** `computeDelayMs` capped exponential
backoff at `maxDelayMs` but returned a provider's `Retry-After` unbounded. A
single `Retry-After: 5` is the 6.4 s observation, on its own.

**The voice budget was being overridden.** `resolveVoiceConfig` read
`OPENROUTER_MAX_ATTEMPTS`, which every compose file sets to 3, silently
replacing the voice-specific default of 2. Three attempts on each of two models
is six sequential round trips while the candidate sits in silence.

**The shared retry policy is sized for text.** `maxDelayMs: 8000` is reasonable
for a CV generation nobody is watching. It is meaningless inside a turn with a
one-second budget.

**And nothing was observable.** `runModelChain`'s own comment says the failover
"has to be ours to be observable and certain" — but no attempt count, no model,
no timing was ever recorded. A fall back to `gpt-audio`, nineteen times the
price, looked exactly like a slow `gpt-audio-mini`. The env vars that would let
someone repoint the model (`INTERVIEW_VOICE_MODEL` and friends) were read by the
config but present in no `.env.example` and no compose file, so they could not
be set at all.

## Decision

- **Cap `Retry-After` at `maxDelayMs`.** A provider asking us to wait five
  seconds is describing its own queue, not our budget. Failing over to the next
  model beats leaving the candidate talking to a silent room.
- **`VOICE_RETRY_POLICY`**: two attempts, 200 ms base, 900 ms ceiling, separate
  from `DEFAULT_RETRY_POLICY`.
- **`INTERVIEW_VOICE_MAX_ATTEMPTS`**, deliberately not `OPENROUTER_MAX_ATTEMPTS`,
  so the shared text budget cannot reach the voice path again.
- **One structured JSON log line per turn**: model served, attempts, models
  tried, whether it fell back, time to first audio, total, transcription, and
  the gap between total and time-in-calls — that gap is backoff, and it is the
  number worth alerting on.
- **`firstTokenMs` measures from the end of the answer**, not from the request.
  The clock used to start at `fetch`, which excluded the VAD tail, the WAV
  encode and the upload — all silence the candidate sits through. The number on
  screen went up as a result; that is the point, and it is the interval the
  1.2 s target refers to.
- **The voice env vars are documented and passed through all four compose
  files.**

## Consequences

- A throttled primary now costs at most ~900 ms of backoff before failing over,
  rather than however long the provider asked for.
- The latency strip reports a larger number than before for the same turn. It
  is the honest one.
- Cost regressions become visible: a session quietly served by `gpt-audio`
  shows up in the logs as `fellBack: true`.
- Still unmeasured, deliberately: the candidate's recording is uploaded twice
  in parallel, once for the voice call and once for transcription. It does not
  delay the first audio frame, only the end of the turn. The new
  `transcriptionMs` against `totalMs` answers whether that is free in one
  session — worth deciding on data rather than blind.
