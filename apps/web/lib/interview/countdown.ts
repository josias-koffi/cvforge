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
