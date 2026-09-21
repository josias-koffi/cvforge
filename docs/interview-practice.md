# Interview Practice

A candidate speaks to an AI recruiter, and gets a scored report on what went
well and what did not. `E12`/`E13` built the pipeline, `US-066` finished the
reporting, and this document describes what actually runs.

## The loop

1. `/entretiens/new` — pick a candidature (or free practice), a recruiter
   profile, a language and a duration. The credit cost is shown before the
   click.
2. `/entretiens/[sessionId]` — the studio. **The recruiter opens**: as soon as
   the microphone is live it greets the candidate and asks its first question.
   Voice detection then records when the candidate speaks and stops after a
   pause; there is no push-to-talk. Each answer goes up as audio and the reply
   comes back as audio, one call, playing as it arrives.
3. `/entretiens/[sessionId]/rapport` — score out of ten, five scored
   dimensions, the advice, the transcript, and the facts counted from it.
4. `/entretiens/progression` — how the scores move across recent sessions,
   and which dimensions recur as strengths or weaknesses.

Recruiter profiles: `standard`, `aggressive`, `passive`, `technical`,
`behavioral`. Languages: French and English. Durations: 10, 20 or 30 minutes,
defaulting to 10.

## The agenda

The interview follows a plan, computed server-side; the model is told only
which phase it is in and how much time is left (`ADR-015`). Without it the
prompt's instruction to "pose exactement une question de relance" kept the
recruiter on the first topic for the whole session.

Eight phases: welcome, career history, motivation, competencies, company and
role fit, practical matters (salary expectations included), the candidate's
questions, closing. Each profile weights them differently — a technical
recruiter spends nearly half the interview on competencies — and each has a
45-second floor so a short interview still reaches a real closing.

The phase advances on whichever is further along, the clock or the number of
answers, and never goes backwards — but the answer count may only lead the
clock by **one phase**, so a brisk candidate moves faster through the trame
without finishing the interview early. The clock starts on the first spoken
turn, not when the session was created.

**Nothing is cut off mid-turn.** At the end the recruiter is told to wrap up
and the studio says the time is spent. Twenty seconds past the deadline, at the
first gap where nobody is speaking, the studio scores the interview itself and
the candidate lands on their report. `shouldAutoFinish` will not stop a turn in
progress: ending one would discard the answer and the credit that paid for it.

## What the recruiter knows

A frozen snapshot of the offer, the company and the candidate's CV, taken when
the session opens and budgeted at roughly 450 tokens — it is paid for on every
turn. Frozen rather than re-read: a database round trip does not belong in a
1.2 s budget, and an offer edited mid-interview must not change the questions
already being asked. The CV side is pseudonymised (roles, dates, skills; never
name, phone or address).

The company context — sector, size, culture, stated values, typical pay — is
derived from the offer text on the first interview that needs it, then cached
on the application. It is never scraped from the open web.

## Credits

A session costs **one credit per minute** — 10, 20 or 30 — charged when it is
created, not when it ends. Billing by the minute rather than a flat fee follows
the cost: one speech call and one transcription per answer, and a session fits
roughly one answer per three-quarters of a minute whatever its length. The
scored report at the end is inside that price and is never charged separately.

The cost is committed as soon as the session runs, so charging at the end would
let an abandoned tab run up a bill for free. `finishSession` never touches
credits, and nothing is refunded: a failed turn leaves the session usable, so
the candidate can simply speak again.

A second "Démarrer" within thirty minutes hands back the untouched session
rather than opening — and charging for — a second one, but only when it runs
for the same length: the two do not cost the same, and handing back a shorter
session would silently ignore the duration just picked.

## Voice

One speech-to-speech call per turn: the candidate's WAV in, PCM16 out over SSE,
playing as it arrives (`ADR-014`). This replaced transcribe → chat → speak,
whose three round trips came to six to eight seconds per turn.

| Rank | Model | first audio | $/turn |
|---|---|---|---|
| 1 | `openai/gpt-audio-mini` | 1129 ms | 0.00044 |
| 2 | `openai/gpt-audio` | 751 ms | 0.00822 |

Override with `INTERVIEW_VOICE_MODEL`, `INTERVIEW_VOICE_FALLBACK_MODELS`,
`INTERVIEW_VOICE` (the preset voice), `INTERVIEW_VOICE_MAX_ATTEMPTS` and
`INTERVIEW_VOICE_MAX_TOKENS`. The attempts budget is deliberately separate from
`OPENROUTER_MAX_ATTEMPTS`: a turn has about a second, so it fails over rather
than waiting out a throttle (`ADR-016`).

Every turn writes one JSON log line naming the model that actually served it,
the attempt count, time to first audio and the time spent asleep in backoff —
without it, a fall back to the pricier model is indistinguishable from a slow
cheap one.

**No barge-in.** OpenRouter is request/response with no bidirectional socket,
so the candidate cannot interrupt mid-sentence. That needs a realtime API.

## Speech to text

Transcription runs *beside* the voice call, never in front of it: the report is
built from the candidate's own words, and nothing is waiting on it. Through
OpenRouter's dedicated `/audio/transcriptions` endpoint, over a
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

The report and the company-context derivation use the shared chat chain
(`OPENROUTER_MODEL` plus its fallbacks), like the rest of the application.

## Voice detection

Amplitude over `getByteTimeDomainData`, with hysteresis and an adaptive noise
floor: the onset threshold sits above the measured room tone rather than at a
fixed value.

The silence that ends an answer is **1.5 s once the candidate is under way,
2.8 s before that** — an interview question is not chat, and "alors… euh…"
while someone gathers an example is how a considered answer starts. Measured in
milliseconds rather than animation frames, and capped at 90 seconds. A burst
under 400 ms is dropped as a cough rather than sent.

`autoGainControl` is off on purpose — it lifts room tone into the speech band
during exactly the pauses the detector needs to hear.

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
- `apps/api/src/interview/interview.agenda.ts` — the phase plan, a pure
  function of elapsed time, answers given, profile and duration
- `apps/api/src/interview/interview.context.ts` — the frozen offer/CV snapshot,
  shared by the interview prompt and the report prompt
- `apps/api/src/ai/openrouter-voice.service.ts` — the speech-to-speech turn
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
- The candidate's recording is uploaded twice in parallel, once for the voice
  call and once for transcription. It does not delay the first audio frame,
  only the end of the turn; `transcriptionMs` against `totalMs` in the turn log
  will say whether that is worth changing.
- Company context comes from the offer alone. Sector, culture and pay are what
  the company says about itself, not what anyone else does.
