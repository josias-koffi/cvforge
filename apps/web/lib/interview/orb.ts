import type { StudioPhase } from "@/lib/interview/studio-machine"

/**
 * What the orb is showing, which is not quite what the microphone is doing.
 *
 * The VAD only knows about the candidate: while the interviewer speaks it
 * reports `processing`, the same as while an answer uploads. Those two feel
 * nothing alike — one is a voice in the room, the other is a wait — so the
 * orb reads the studio phase instead and gets a state of its own.
 */
export type OrbState =
  | "idle"
  | "listening"
  | "recording"
  | "thinking"
  | "speaking"
  | "muted"

export function orbState({
  phase,
  muted,
}: {
  phase: StudioPhase
  muted: boolean
}): OrbState {
  if (phase === "booting" || phase === "completed" || phase === "error") {
    return "idle"
  }
  // Checked after the phases above: a muted microphone during the recruiter's
  // reply changes nothing about the reply, and saying "micro coupé" over a
  // voice that is still talking would just be wrong.
  if (phase === "speaking") return "speaking"
  if (muted) return "muted"
  if (phase === "processing") return "thinking"
  if (phase === "recording") return "recording"

  return "listening"
}

/**
 * What the orb shows when nobody is talking.
 *
 * Not zero: the sphere's flow and its rings are driven by these two numbers,
 * and at zero it freezes into a hard-edged pinwheel that reads as a crashed
 * page. Upstream's own idle animation sits around here.
 */
const RESTING_INPUT = 0.2
const RESTING_OUTPUT = 0.3

/**
 * How much of the range a live voice is given above the resting level.
 *
 * Speech peaks around 0.3 on our meter — passed through raw, the orb would
 * barely move. This maps it onto the range the shader was tuned for.
 */
const LIVE_GAIN = 2.2

/**
 * The two volumes the orb is driven by, 0-1 each.
 *
 * Split rather than merged because the orb draws them differently: `input` is
 * the room coming in, `output` is the voice going out. Each is zeroed unless
 * its side actually holds the floor — the microphone meter freezes on its
 * last reading while the recruiter talks (voice detection is paused then),
 * and a frozen reading would show as a permanently half-open microphone.
 */
export function orbVolumes({
  state,
  level,
  voiceLevel,
}: {
  state: OrbState
  level: number
  voiceLevel: number
}) {
  const listening = state === "listening" || state === "recording"
  const quiet = state === "idle" || state === "muted"

  return {
    input: listening ? live(RESTING_INPUT, level) : RESTING_INPUT,
    output:
      state === "speaking"
        ? live(RESTING_OUTPUT, voiceLevel)
        : // Still and pale once the session is over or the mic is off: the
          // orb should look switched off, not merely quiet.
          quiet
          ? 0.1
          : RESTING_OUTPUT,
  }
}

function live(resting: number, level: number) {
  return clamp(resting + clamp(level) * LIVE_GAIN * (1 - resting))
}

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0

  return Math.min(Math.max(value, 0), 1)
}
