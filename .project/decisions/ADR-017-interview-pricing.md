# ADR-017: An interview costs one credit per minute, and a complete application includes one

Date: 2026-09-21
Status: accepted
Supersedes in part: ADR-012 (the prices hold; the credit sizing does not)

## Context

ADR-012 sized the launch packs when a "complete application" meant offer
analysis + tailored CV + cover letter, 7 credits. The voice interview and its
scored report shipped afterwards (ADR-013 to ADR-016) and left the pricing
describing a product that no longer exists:

- **The interview was the cheapest action in the catalogue.** Two credits flat,
  against three for a CV generation, for six to sixteen times the API cost.
  Measured: ~€0.007 for ten minutes, ~€0.018 for thirty (`openai/gpt-audio-mini`
  at $0.00044 a turn, whisper-large-v3-turbo beside it, one chat call for the
  report). The report, the company-context call the interview triggers, and the
  per-application insights were all free.
- **The price ignored the length.** Ten, twenty and thirty minutes cost the
  same, so nobody had a reason to pick ten.
- **The advertised promise was wrong.** The landing sold "analysis, CV and
  letter". The interview — what competitors sell on its own for $8 to $90 a
  month (Yoodli, Final Round AI) — was outside the thing being counted.
- **A latent billing bug.** `apps/web/app/api/interviews/sessions/route.ts`
  dropped `durationMinutes`, so every session ran for ten minutes whatever the
  candidate picked. Charging by the minute on top of that would have billed
  thirty credits for ten minutes.

## Decision

- **One credit per interview minute.** `CREDITS_PER_INTERVIEW_MINUTE = 1` and
  `interviewSessionCost(minutes)` in `@cvforge/types`; the whole session is
  charged up front, report included. `AI_CREDIT_COSTS[interview_session]` is
  kept, derived from the default duration, so every surface that shows one
  figure per action keeps working. This is also what vision §11.4 specified.
- **A complete application is 17 credits** (1 + 3 + 3 + 10) and includes a
  ten-minute interview with its report. Someone who never runs an interview
  gets more applications than advertised, never fewer — the count under-promises
  by construction.
- **The three prices do not move.** €5.90 / €14.90 / €29.00 were deployed days
  ago and the advertised counts (5 / 20 / 50 applications) stay identical; the
  packs grow instead, to 90 / 350 / 870 credits. Raising prices right after a
  launch is a worse signal than widening what the same price buys, and the cost
  side does not constrain the decision: an Intensif pack spent entirely on
  interviews costs about €0.90 of API against €23.50 of net revenue.
- **Welcome credits go from 16 to 36** — a CV import plus two complete
  applications, interviews included. The differentiator is now something a
  visitor can try before paying.
- **Ledger lines carry the duration**, in the note and in `metadata`, because a
  −10 and a −30 line are otherwise indistinguishable in the history.
- **Migration `0015` updates the offers in place** rather than archiving and
  re-inserting them. The price is unchanged, so the existing `stripe_price_id`
  stays valid and checkout never returns 503 — unlike the archive-then-insert
  of `0012`, which needed a manual Stripe sync before anyone could pay.

### Alternatives considered

**Keep a flat fee, higher.** Simple to explain, but a thirty-minute session
still costs what a ten-minute one does, so everyone picks thirty and the cost
triples for nothing.

**Keep "application" at 7 credits and sell interviews as a separate unit.**
Every pack would then promise two numbers ("20 applications + 10 interviews"),
every balance would need two estimates, and the two would drift. One unit that
already includes the interview says more with less.

**Raise the prices.** The market would bear it. Rejected for now: the landing
and the Stripe prices went live days ago, and the first move after a launch
should not be a price increase.

## Consequences

- A session reused within the thirty-minute window is only handed back when it
  runs for the length being asked for. Asking for thirty after abandoning a ten
  opens — and charges — a new session, leaving the paid short one unused. The
  alternative was to silently give the candidate the length they did not pick.
- No retroactive adjustment: interviews already bought at 2 credits stay so.
- Welcome credits more than double, so a throwaway-email sign-up is worth about
  €0.02 of AI instead of €0.005. Still negligible, but the disposable-email
  filter deferred in ADR-012 is now worth more.
- The voice chain falling back to `openai/gpt-audio` costs roughly nineteen
  times the head model and is invisible in the price. The existing OpenRouter
  balance alert is what catches it; per-user spend is not tracked.
- Vision §11.4 is honoured again by the action costs. §11.5 still describes the
  archived Starter/Pro packs and is now two generations behind — for the owner
  to revise, since agents do not edit `vision.md`.
