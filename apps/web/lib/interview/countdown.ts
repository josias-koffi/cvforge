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
 * Only ever in a gap. `listening` is the one phase where nobody is talking:
 * the candidate is not mid-answer and the recruiter is not mid-sentence.
 * Ending anywhere else throws away an answer and the credit that paid for it.
 */
export function shouldAutoFinish(input: {
  elapsed: number
  durationMinutes: number
  /** The studio's phase; only `listening` is a safe moment to stop. */
  phase: string
  /** An interview nobody answered is not worth a report. */
  hasAnswered: boolean
  finishing: boolean
}): boolean {
  if (input.finishing || !input.hasAnswered) return false
  if (input.phase !== "listening") return false

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
