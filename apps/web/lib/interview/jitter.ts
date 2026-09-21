/**
 * When to start each frame of the interviewer's voice.
 *
 * Frames are scheduled end to end so the speech comes out continuous, but they
 * only stay continuous while they arrive ahead of the speakers. A frame that
 * arrives late cannot be played in the past, so it is pushed forward and the
 * candidate hears a gap.
 *
 * The first version kept a fixed 50 ms of margin, which covers a LAN and not a
 * TLS hop through a reverse proxy, a VPS and a route handler. Worse, it reset
 * to 50 ms after every late frame, so a jittery connection reopened the same
 * gap over and over. Here the margin only ever grows within a turn: a network
 * that has stuttered once will stutter again, and widening the window is the
 * one thing that stops the next stutter being heard.
 *
 * Arithmetic only — the hook holds the audio nodes and calls this.
 */

/** Where the margin starts. */
export const INITIAL_LEAD_MS = 160
/** How much a late frame widens it. */
export const LEAD_GROWTH_MS = 70
/**
 * The ceiling. Past this the margin is its own problem: it delays the end of
 * the reply, and with it the moment the microphone reopens.
 */
export const MAX_LEAD_MS = 420

export type JitterState = {
  /** Current margin, in milliseconds. */
  leadMs: number
  /** Where the queued audio ends, on the audio context's clock, in seconds. */
  playhead: number
  /** Late frames so far this turn. */
  underruns: number
}

export const initialJitterState: JitterState = {
  leadMs: INITIAL_LEAD_MS,
  playhead: 0,
  underruns: 0,
}

export type ScheduledFrame = {
  /** When to start the frame, on the audio context's clock, in seconds. */
  startAt: number
  /** The margin this frame actually got, in milliseconds. */
  leadMs: number
  /** The speakers had run dry before this frame: a gap was heard. */
  underrun: boolean
  next: JitterState
}

/**
 * Places one frame after the last, or as soon as the margin allows if the
 * speakers have already caught up.
 *
 * Note what counts as an underrun: the queue having actually run dry, not the
 * margin having been nibbled at. A stream delivered at roughly real time sits
 * a hair under its target margin frame after frame without a single gap, and
 * calling that an underrun would widen the window until it hit the ceiling on
 * a connection that never stuttered.
 */
export function scheduleFrame(
  state: JitterState,
  { now, durationSeconds }: { now: number; durationSeconds: number }
): ScheduledFrame {
  const earliest = now + state.leadMs / 1000
  const startAt = Math.max(state.playhead, earliest)
  // A playhead of zero is the start of a turn, not a queue that ran out.
  const underrun = state.playhead > 0 && state.playhead < now

  return {
    startAt,
    leadMs: (startAt - now) * 1000,
    underrun,
    next: {
      leadMs: underrun
        ? Math.min(state.leadMs + LEAD_GROWTH_MS, MAX_LEAD_MS)
        : state.leadMs,
      playhead: startAt + durationSeconds,
      underruns: state.underruns + (underrun ? 1 : 0),
    },
  }
}
