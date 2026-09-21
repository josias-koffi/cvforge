# ADR-015: The interview follows a server-computed agenda, and the model is only told where it stands

Date: 2026-09-21
Status: accepted

## Context

The first end-to-end test of the voice interview surfaced one complaint above
the rest: *"j'ai lancé l'IA sur une question, elle m'a posé une question, j'ai
répondu, elle a gardé cette question comme fil conducteur tout le long."*

That was not drift. The base system prompt said, literally:

> Pose exactement une question de relance naturelle, sauf si une courte remarque
> de feedback est plus utile.

"Relance" is a follow-up on what was just said. The model was **instructed**
never to change topic, and it obeyed for the whole session. Nothing told it
there was other ground to cover, that time was passing, or that an interview has
an end.

Two related gaps made it worse. `buildAiPrompt` received only the language and
the recruiter style — `startSession` fetched the linked application solely to
check ownership and discarded it, so the recruiter never knew what job it was
interviewing for, while the setup form promised the opposite. And there was no
notion of duration anywhere, although vision §10.5 specifies one ("définition de
la durée max, recommandé : 10 minutes") and §10.6 lists the context that should
reach the agent.

## Decision

**A static, ordered, time-budgeted plan, computed server-side. The model is told
only which phase it is in and how long is left.**

Eight phases, in the sequence structured-interview practice uses: welcome,
career history, motivation, competencies, company and role fit, practical
matters (salary expectations included), the candidate's questions, closing.
Each recruiter profile weights them differently — a technical interviewer gives
competencies nearly half the time, a passive one lets the candidate talk longer.
Every phase has a 45-second floor, so a ten-minute interview still gets a real
closing rather than thirty-six seconds of one.

The current phase is the later of what the clock says and what the conversation
says, and it never goes backwards. A candidate answering in three words still
progresses; a verbose one is still moved on.

**The conversation may lead by one phase, no more.** Unbounded, the exchange
count is not a second opinion about where the interview stands — it overrides
the clock outright, and the first live ten-minute session ended with 3:58 still
to run. The pace that fed it was a guess: 90 s per exchange priced the whole
interview at nine, where a spoken turn measures nearer 45 s. Both are fixed,
and either alone would have been enough to end a session early, so both are
now asserted. The clock owns the interview's length; the conversation only
decides how quickly it moves inside it.

Per-turn steering travels in the system prompt because there is nowhere else:
`VoiceTurnRequest` carries a system prompt, a history and audio, and nothing
more. The prompt is rebuilt every turn anyway, so this is free.

### Alternatives considered

**Let the model plan.** A speech model has no reliable sense of elapsed time and
cannot schedule itself. A plan carried in prose costs tokens on every turn and
drifts as the window slides. And it cannot be tested.

**Generate a JSON plan at session start.** It burns a call and a second of
latency before the greeting, and it still needs a deterministic "where am I now"
function to enforce it — so it adds cost without removing the part that matters.

**Company-culture enrichment from the open web.** Rejected for now. The company
context is derived from the offer text the account already holds: an offer is
written by the company about itself, which is the tone a candidate is asked to
match. Scraping news and review sites is a separate decision with its own
privacy answer.

## Consequences

- `(elapsed, exchanges, profile, duration) → phase` is a pure function, which
  is what carries the 90 % coverage requirement for this feature.
- A session carries a **frozen** snapshot of the offer, the company and the
  candidate's CV, taken at creation. Not read per turn: a database round trip
  does not belong inside a 1.2 s budget, and an offer edited mid-interview must
  not change the questions already being asked. The CV side is pseudonymised per
  vision §10.6 — roles, dates and skills, never name, phone or address.
- That snapshot is paid for on every turn, so it is budgeted at roughly 450
  tokens and clipped on word boundaries.
- `startedAt` is stamped on the first spoken turn, not at session creation.
  Credits are spent when the session opens, sometimes minutes before anyone
  reaches the studio, and the agenda must not spend its budget waiting.
- **The studio ends the interview itself, but only in a gap.** The original
  decision left finishing entirely to the candidate. Asked for on 2026-09-21,
  after a live session where the clock ran on long past the recruiter's
  closing: twenty seconds past the deadline, at the first moment nobody is
  speaking, the studio scores the session and the candidate is redirected to
  their report. The constraint that produced the original decision is
  unchanged and now enforced by `shouldAutoFinish` — a turn in progress is
  never cut short, because ending one discards the answer and the credit that
  paid for it.
- `MAX_MESSAGES = 20` had to be split in two. It was serving as both the model's
  context window and a destructive cap applied on write, which deleted the first
  half of any interview past ten exchanges — and that array is what the final
  report is graded from.
