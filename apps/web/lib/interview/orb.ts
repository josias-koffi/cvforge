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
 * The amplitude the orb breathes on, 0-1.
 *
 * Whoever holds the floor drives it: the microphone while the candidate
 * answers, the interviewer's own output while it replies. The rest of the
 * time it rests on a slow idle breath rather than sitting perfectly still —
 * a frozen orb reads as a frozen app.
 */
export function orbAmplitude({
  state,
  level,
  voiceLevel,
}: {
  state: OrbState
  level: number
  voiceLevel: number
}) {
  if (state === "speaking") return clamp(voiceLevel)
  if (state === "recording") return clamp(level)

  return 0
}

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0

  return Math.min(Math.max(value, 0), 1)
}
