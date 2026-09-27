/**
 * How long is left, for the studio's clock.
 *
 * Derived from the session's own `startedAt` rather than a counter in the
 * component, so reloading the page mid-interview resumes the countdown
 * instead of starting it again.
 */

/** Inside this, the interviewer is already closing. */
const WRAP_UP_SECONDS = 60

export type CountdownTone = "running" | "wrapup" | "overtime"

export type CountdownState = {
  remainingSeconds: number
  /** `mm:ss`, or `+mm:ss` once the time is spent. */
  label: string
  tone: CountdownTone
}

/** Seconds since the first spoken turn; zero before anyone has spoken. */
export function elapsedSeconds(startedAt: string | null, nowMs: number): number {
  if (!startedAt) return 0

  const started = Date.parse(startedAt)
  if (Number.isNaN(started)) return 0

  return Math.max(0, Math.floor((nowMs - started) / 1000))
}

/** `mm:ss`, counting past an hour rather than wrapping round. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(seconds / 60)

  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
}

/**
 * Grace after the deadline before the studio scores the interview itself.
 *
 * The recruiter delivers its closing in the last minute; this leaves room for
 * the candidate to answer it rather than being cut off mid-goodbye.
 */
export const AUTO_FINISH_GRACE_SECONDS = 20

/**
 * Whether the studio should end and score the interview without being asked.
 *
 * Never while someone is talking — the candidate mid-answer, or the recruiter
 * mid-sentence — which would throw away an answer and the credit that paid
 * for it, and never during a pause. Waiting for the recruiter's reply is not
 * such a moment: after the goodbye, a "merci" from the candidate may never
 * get one.
 *
 * Two things end an interview. The recruiter running out of things to ask is
 * the ordinary one, and it does not wait for the clock: leaving the candidate
 * sitting in front of a recruiter that has already said goodbye is the
 * interview's worst moment. The deadline is the backstop for a session that
 * never reached its closing.
 */
const AUTO_FINISH_PHASES = new Set(["listening", "processing", "ended"])

export function shouldAutoFinish(input: {
  elapsed: number
  durationMinutes: number
  /** The studio's phase; `recording`, `speaking` and `paused` hold it off. */
  phase: string
  /** An interview nobody answered is not worth a report. */
  hasAnswered: boolean
  finishing: boolean
  /** The recruiter has said goodbye and has nothing left to ask. */
  concluded: boolean
}): boolean {
  if (input.finishing || !input.hasAnswered) return false
  if (!AUTO_FINISH_PHASES.has(input.phase)) return false
  if (input.concluded) return true

  return (
    input.elapsed >= input.durationMinutes * 60 + AUTO_FINISH_GRACE_SECONDS
  )
}

export function resolveCountdown(
  elapsed: number,
  durationMinutes: number
): CountdownState {
  const remainingSeconds = durationMinutes * 60 - Math.max(0, elapsed)

  if (remainingSeconds <= 0) {
    return {
      label: `+${formatDuration(-remainingSeconds)}`,
      remainingSeconds: 0,
      tone: "overtime",
    }
  }

  return {
    label: formatDuration(remainingSeconds),
    remainingSeconds,
    tone: remainingSeconds <= WRAP_UP_SECONDS ? "wrapup" : "running",
  }
}
