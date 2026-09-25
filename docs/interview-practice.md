# Interview Practice

A candidate speaks to an AI recruiter, and gets a scored report on what went
well and what did not. `E12`/`E13` built the pipeline, `US-066` finished the
reporting, and this document describes what actually runs.

## The loop

1. `/entretiens/new` — pick a candidature (or free practice), a recruiter
   profile, a language and a duration. The credit cost is shown before the
   click.
2. `/entretiens/[sessionId]` — the studio. It is a live call with the
   recruiter over WebRTC (`ADR-026`). **The recruiter opens**: as soon as the
   call connects, it greets the candidate and asks its first question. The
   call itself hears when the candidate has finished a sentence, and the
   candidate can talk over the recruiter at any point. There is no
   push-to-talk.
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

A session costs **1.5 credits per minute** — 15, 30 or 45 — charged when it is
created, not when it ends. Billing by the minute rather than a flat fee follows
the cost: one speech call and one transcription per answer, and a session fits
roughly one answer per three-quarters of a minute whatever its length. The
scored report at the end is inside that price and is never charged separately.

The rate was one credit a minute until 2026-09-25. The live Realtime voice
costs about €0.24 for ten minutes, which left the Intensif pack (€0.034 a
credit) with about a quarter of margin on an interview. At 1.5 the margin is
about 50 % on Intensif, 60 % on Recherche active and 75 % on Essentiel. The
packs keep their prices and credits: a complete application is now 22 credits,
so they promise 4, 15 and 38 applications instead of 5, 20 and 50.

The cost is committed as soon as the session runs, so charging at the end would
let an abandoned tab run up a bill for free. `finishSession` never touches
credits, and nothing is refunded: a failed turn leaves the session usable, so
the candidate can simply speak again.

A second "Démarrer" within thirty minutes hands back the untouched session
rather than opening — and charging for — a second one, but only when it runs
for the same length: the two do not cost the same, and handing back a shorter
session would silently ignore the duration just picked.

## Voice

A live call with OpenAI's Realtime API over WebRTC (`ADR-026`), which replaced
one speech-to-speech request per turn through OpenRouter (`ADR-014`, `ADR-018`
to `ADR-020`).

The browser's microphone goes up as a media track, and the recruiter's voice
comes back as one. Three things are the call's own job:

- **Turn detection** is a thresholded loudness detector (`server_vad`, 0.8)
  by default. Semantic detection (`semantic_vad`) hears that a sentence is
  finished, but it mistook five room noises for the candidate in one live
  test, against one at 0.8.
- **Interruption** is native. When the candidate talks, generation stops on
  OpenAI's side and the reply is truncated where it was heard.
- **Playback** needs no jitter buffer or PCM decoding on our side.

The browser asks for redundant audio (RED) ahead of plain Opus: each packet
also carries the previous one, so a lost packet is rebuilt rather than
invented, which is what makes the voice crackle. When a call ends, the console
prints `[interview] audio {codec, lossPct, jitterMs, concealedPct, …}`.

The browser never holds the key or the brief:

1. `useRealtimeCall` posts its SDP offer to
   `POST /interviews/sessions/:id/realtime`.
2. Nest forwards the offer to `POST /v1/realtime/calls`, with the session
   (model, voice, instructions, transcription), and returns OpenAI's answer.
3. Nest then joins the same call through a server-side WebSocket, the
   sideband (`InterviewCall`).

Through the sideband, Nest:

- records the conversation, in order, for the report;
- pushes the agenda into the instructions after every reply;
- hangs up once the goodbye has played, or once the paid duration plus 90 s
  is spent.

| Setting | Default | Variable |
|---|---|---|
| Model | `gpt-realtime-2.1-mini` | `INTERVIEW_REALTIME_MODEL` |
| Voice | `marin` | `INTERVIEW_REALTIME_VOICE` |
| Turn eagerness | `medium` | `INTERVIEW_REALTIME_EAGERNESS` |
| Noise reduction | `far_field` (laptop microphone) | `INTERVIEW_REALTIME_NOISE_REDUCTION` |
| Turn detection | `server`, thresholded (or `semantic`) | `INTERVIEW_REALTIME_TURN_DETECTION` |
| Server detection threshold | 0.8 | `INTERVIEW_REALTIME_VAD_THRESHOLD` |
| Reply cap | 1500 tokens (audio, ~1 min) | `INTERVIEW_REALTIME_MAX_OUTPUT_TOKENS` |
| Candidate transcription | `gpt-4o-mini-transcribe` | `INTERVIEW_REALTIME_TRANSCRIPTION_MODEL` |

`OPENAI_API_KEY` is required.

The mini costs roughly $0.15–0.30 for ten minutes, against the €0.34–0.66
that ten credits sell for. The full `gpt-realtime-2.1` is about three times
that and does not fit the price.

Every reply re-reads the whole conversation, so the prompt cache is what keeps
it affordable. Anything that changes the instructions voids that cache. They
are therefore resent only when the agenda phase changes, and the "already
covered" line is worked out once per call. Recomputed after every reply, that
line pushed a ten-minute interview to $0.39. Past 8,000 tokens of conversation
(about eight minutes), the oldest 30% are dropped in one cut, so that 20- and
30-minute interviews cost no more per reply than a 10-minute one.

Every reply is priced from its `usage` (`openai-realtime.pricing.ts`) and
filed in the AI cockpit as `interview_voice`, and each transcription of the
candidate as `interview_transcription`. Each call ends with one log line:
`interview.call session=… endedBy=… responses=… interrupted=… costUsd=…`.

**How the interview ends.** The recruiter has one tool, `end_interview`,
which it calls once it has said goodbye: when the interview is over, or when
the candidate asks to stop. The server then hangs up once the goodbye has
played, and the studio sees the call on its data channel and scores the
session. The agenda counts answers, which is not enough on its own: an
interview of few, long answers never reached the count, the recruiter said
goodbye on the clock, and the report never ran.

**Pause.** "Pause" hangs the call up and stops the clock (`paused_at`,
migration 0047). Resuming opens a new call, with the start moved forward by
the length of the pause. A paused interview reopens paused after a reload.

A dropped call can be resumed with the "Reprendre l'appel" button. The
conversation so far is replayed into the new call as text, and the recruiter
picks up the thread without greeting again.

## Speech to text

The candidate is transcribed inside the call, by `gpt-4o-mini-transcribe`, and
only to build the report: the recruiter hears the audio itself and never waits
on the transcript. The transcript often lands after the reply has started, so
`InterviewCall` holds each item in conversation order and writes it only once
everything before it is known.

The report and the company-context derivation use the shared chat chain on
OpenRouter (`OPENROUTER_MODEL` plus its fallbacks), like the rest of the
application.

## Audio and retention

**Recorded audio is never persisted.** It flows to OpenAI during the call and
nowhere else; only the text is stored. That is why the report has no playback
control. The audio is processed in the US, a gap with vision §15.2 that the
product owner accepted (`ADR-026`); zero data retention is to be requested from
OpenAI.

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
- `apps/api/src/ai/openai-realtime.service.ts` — opening, joining and hanging
  up a Realtime call; `openai-realtime.pricing.ts` prices its usage
- `apps/api/src/interview/interview-call.ts` — one live call as the server
  follows it: recording, agenda steering, hanging up
- `apps/api/src/interview/interview-realtime.service.ts` — one call per session
- `apps/web/lib/interview/` — the studio's logic with no React in it: the
  mapping of call events and the reducer that holds every state transition
- `apps/web/hooks/interview/use-realtime-call.ts` — the WebRTC call itself
- `apps/web/app/api/interviews/` — BFF route handlers; the session cookie is
  httpOnly, so the studio cannot call the API directly

## Known limits

- No fallback model for the voice: if OpenAI refuses the call, the studio
  says so and offers to retry.
- A call lives in the process that opened it; the sideband does not survive
  a redeploy, and the candidate has to resume the call.
- There is no replay: without stored audio, a candidate cannot listen back.
- The progress window is the last ten finished sessions, which the 30-day
  retention effectively caps anyway.
- Company context comes from the offer alone. Sector, culture and pay are what
  the company says about itself, not what anyone else does.
