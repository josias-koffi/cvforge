# ADR-020: Being cut off is not recoverable, and the onset threshold was running away

Date: 2026-09-21
Status: accepted

Supersedes the turn-budget decision of ADR-018.

## Context

ADR-018 cut the detector's patience — 1500 ms to 900 ms once an answer was
under way, 2800 ms to 1800 ms while it was still being found — on the argument
that barge-in made an early cut recoverable in a word.

The first real session on staging said otherwise, in three separate ways:

> je n'ai pas le temps de parler, au début il a eu du mal à détecter que j'ai
> commencé par parler et après quand j'ai eu des blancs avec euhh il a coupé le
> stream et a commencé par répondre

**The argument was wrong.** Being cut off does not hand the floor back, it
spends the answer: the recruiter has already taken the turn and moved on.
Talking over the reply that follows is not the same thing as having been
allowed to finish, so barge-in bought nothing here and the patience was spent
against a benefit that did not exist.

**The numbers were wrong.** 900 ms came from casual conversation, where turns
swap on 600 to 800 ms of silence. An interview answer is not that. Someone
assembling an example pauses over a second between clauses, and "euh" sits in
the middle of the pause rather than filling it.

**And a real bug was hiding underneath.** In `listening`, the room tone was
updated with the incoming frame and the onset threshold then computed from the
*updated* floor. Since `resolveStartThreshold` is `max(0.045, floor × 2.5)`, a
candidate speaking between the floor and the threshold dragged the bar up
towards themselves without ever reaching it — the harder they tried, the
higher it went, capped only by a floor of 0.05 that put the bar at 0.125, a
shout. That is the "du mal à détecter que j'ai commencé à parler", and it was
there long before ADR-018.

## Decision

**Measure the room against the room.** The onset test uses the floor as it was
before this frame, and only frames quieter than `SPEECH_CONTINUE_RMS` — already
agreed not to be speech — are allowed to move it. `MAX_NOISE_FLOOR` drops from
0.05 to 0.02, so the adaptive bar can never exceed 0.05 however loud the room.

**Open more readily.** `SPEECH_START_RMS` drops from 0.045 to 0.03. A normal
indoor voice a little back from the microphone sat under the old bar.

**Keep the last 400 ms of room.** No threshold can fire on a word before that
word has started, so the opening syllable was lost from every answer. The
worklet already runs continuously, so a rolling window costs nothing and the
recording now begins slightly before the decision to record. This is also what
makes the lower threshold safe: opening eagerly costs a discarded buffer.

**Restore the patience, and then some.** 1800 ms once under way, 3200 ms while
the answer is still being found — both above what ADR-018 replaced.

**Let the candidate earn more.** A fixed budget is either too short for
someone who pauses or too slow for everyone else. Each silence over 700 ms
that turns out to have been a pause — speech picks up again — adds 600 ms to
the budget for the rest of that answer, to a 3500 ms ceiling. Someone who
pauses once will pause again; the same bargain the playback margin already
makes with a network that stutters.

## Consequences

- A turn now ends 900 ms later than ADR-018 left it, and 300 ms later than
  before ADR-018. The silence is still shorter overall than it was, because
  encoding and uploading moved out of it entirely (ADR-019).
- A candidate who pauses repeatedly waits up to 3.5 s at the end of their
  answer. That is the cost of not being cut off mid-sentence, and it is the
  right way round.
- A lower onset threshold means more recordings opened on a noise. They abort
  under `MIN_SPEECH_MS` and cost nothing but a discarded buffer.
- Every answer now carries 400 ms of room in front of it. Transcription sees a
  little more silence; the speech-to-speech model sees the whole first word.
- The invariant test asserting a handover under a second is replaced by one
  asserting it is over 1500 ms. The old one encoded the belief this ADR
  corrects.

## Alternatives considered

- **Reverting to ADR-018's predecessor, 1500/2800.** Would have fixed the
  cutting-off without fixing the onset threshold or the clipped first
  syllable, both of which are older bugs the feedback surfaced.
- **A flat, very long budget.** Simple, and slow for everyone to protect the
  few. The earned budget converges on the same patience only for the people
  who need it.
- **Semantic turn detection.** Ends a turn on the meaning of the sentence
  rather than a silence timer, and would make all of this unnecessary. It
  needs a realtime API — still the one honest reason to revisit WebRTC, as
  ADR-018 already recorded.
