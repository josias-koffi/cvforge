# ADR-018: The choppiness was a decoding bug, and barge-in did not need a realtime API

Date: 2026-09-21
Status: accepted

Supersedes the "No barge-in" consequence of ADR-014.

## Context

The interview was reported as latent and "trop entrecoupé". The per-turn log on
staging (`cvspark-staging-2052sk`, image `2232257`) said the server was fine:
`firstAudioMs` p50 1323 ms, p90 2458 ms, no fallback, no failure. The `totalMs`
spikes to 14 s were `transcriptionMs`, which `transcribeAside` keeps off the
critical path and which the candidate never hears.

So the chopping was in the browser, and it was two bugs.

**Frames were decoded one at a time.** The reply is one continuous PCM16 byte
stream cut wherever the network cut it, but `pcm.ts` ran `atob` on each chunk
and then dropped any odd trailing byte. A chunk whose length leaves one
character over makes `atob` throw, which surfaced as `AI_FAILED` and lost the
whole turn; two or three over silently lost bytes. And dropping the trailing
byte shifts every sample of the *next* frame by one — `0x0123` read as `0x2301`
— which is the crackle. A test asserted the dropping as intended behaviour.
OpenRouter's own audio guide joins the chunks before decoding, for this reason.

**The jitter buffer was 50 ms and did not adapt.** That covers a LAN, not TLS
through Traefik, a VPS and a Next route handler. Worse, `Math.max(playhead,
now + 0.05)` reset the margin to 50 ms after every late frame, so a connection
that stuttered once reopened the same gap indefinitely.

Separately, ADR-014 recorded that barge-in "needs a realtime API". That is true
of *server-side* interruption. It is not true of the thing the candidate
experiences, which is the recruiter stopping when they start talking.

## Decision

**Carry the remainder between frames.** `createVoiceFrameDecoder` holds the
base64 characters that do not complete a group of four and the byte that does
not complete a sample, one decoder per stream, reset between turns.
`decodeVoiceFrame` is deleted rather than fixed: its signature invited the bug.

**Grow the margin, never shrink it inside a turn.** `lib/interview/jitter.ts`
starts at 160 ms and widens by 70 ms, to a 420 ms ceiling, each time the queue
actually runs dry. An underrun is the speakers running out, not the margin
being nibbled — a stream delivered at roughly real time sits a hair under its
target on every frame without a single gap, and counting that would drive the
window to its ceiling on a healthy connection.

**Barge-in against a request/response provider.** `shouldBargeIn` requires all
three of: 1.6× this room's own onset threshold, 280 ms of continuous speech,
and the microphone reading louder than 0.6× what the speakers are putting out.
The third is the one that matters, and it needs both sides measured the same
way, so the player now reports an amplitude RMS beside its display level.
Cutting off is a 15 ms fade on a per-turn gain node — not stopping individual
buffer sources — and the in-flight request is aborted so the server stops
generating a reply nobody will hear. The half-spoken question is kept in the
transcript: it is what the answer answers, and the report is scored against it.

**Spend the recovered patience.** `SILENCE_MS_TO_STOP` 1500 → 900,
`SILENCE_MS_WHILE_SEARCHING` 2800 → 1800, `SETTLED_SPEECH_MS` 2000 → 1500,
`ECHO_TAIL_MS` 350 → 150. Those numbers were not measuring hesitation; they
were insuring against being cut off with no way to take the floor back, which
cost a whole question. Barge-in makes an early cut recoverable in a word.

**Measure in the browser.** `createTurnLog` starts its clock when the request
reaches Nest, so encoding and uploading a megabyte of base64 were never in any
number we had. `playback-stats.ts` counts underruns, misaligned frames, the
observed margin, the encode and the upload, behind
`NEXT_PUBLIC_INTERVIEW_DEBUG`. The latency strip now counts to the moment audio
is *audible*, not the moment it arrives.

## Consequences

- ADR-014's "No barge-in" no longer holds. What still needs a realtime API is
  semantic turn detection — ending a turn on the *meaning* of a sentence rather
  than on a silence timer. No client heuristic approaches it, and it is the one
  remaining reason to revisit WebRTC.
- The initial margin costs about 110 ms of time-to-first-word. The turn budget
  gives back six to ten times that.
- The echo guard's setting is hardware-dependent. Its failure mode is loud and
  unmistakable: the recruiter interrupts itself on its own first word, in a
  loop. If that happens on external speakers, `BARGE_IN_ECHO_RATIO` goes up.
- One silent gain node is left behind per interruption, collected with the
  context at the end of the session. Reusing the node would let the abandoned
  reply's queued audio return underneath the next one.
- `lib/interview/analyser.ts` now holds the analyser-reading helpers. Three
  consumers need them and none is about detecting speech; the player was
  importing them from `vad`, which made no sense.

## Alternatives considered

- **Pre-buffering before the first frame.** Rejected: it adds silence exactly
  where it is most expensive, and the adaptive margin treats the same cause.
  Kept in reserve if underruns turn out to cluster on the first frames.
- **Tracking every `AudioBufferSourceNode` to stop them.** The React compiler
  refused the mutation, and it was right to: the gain node is simpler and fades
  instead of clicking.
- **Migrating to the OpenAI Realtime API over WebRTC.** It would have fixed the
  chopping as a side effect, by deleting the code that contained the bug —
  roughly 1200 lines removed for 900 written, a direct OpenAI key, the loss of
  OpenRouter's routing and fallback, and per-minute billing that runs while the
  candidate is thinking. Not justified to fix around 120 lines of bug. The
  decision is deferred to measurements: underruns p90 at 0, zero misaligned
  frames, client `firstAudioMs` p50 under 2.5 s, and barge-in with no echo
  loop. If underruns persist at `MAX_LEAD_MS`, the SSE transport itself is the
  problem and only WebRTC answers it.
