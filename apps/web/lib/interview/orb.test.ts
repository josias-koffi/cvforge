import { describe, expect, it } from "vitest"

import { orbState, orbVolumes } from "@/lib/interview/orb"

describe("orbState", () => {
  it("shows the recruiter speaking even while the microphone is muted", () => {
    expect(orbState({ muted: true, phase: "speaking" })).toBe("speaking")
  })

  it("distinguishes waiting for an answer from carrying one", () => {
    expect(orbState({ muted: false, phase: "processing" })).toBe("thinking")
    expect(orbState({ muted: false, phase: "recording" })).toBe("recording")
    expect(orbState({ muted: false, phase: "listening" })).toBe("listening")
  })

  it("reports a muted microphone once the floor is the candidate's", () => {
    expect(orbState({ muted: true, phase: "listening" })).toBe("muted")
  })

  it("rests before the first turn and after the last", () => {
    for (const phase of ["booting", "connecting", "ended", "completed", "error"] as const) {
      expect(orbState({ muted: false, phase })).toBe("idle")
    }
  })
})

describe("orbVolumes", () => {
  it("gives the floor to whoever is talking", () => {
    const speaking = orbVolumes({
      level: 0.2,
      state: "speaking",
      voiceLevel: 0.4,
    })
    const recording = orbVolumes({
      level: 0.4,
      state: "recording",
      voiceLevel: 0.2,
    })

    // The recruiter's voice moves the output and leaves the microphone at
    // rest, and the other way round.
    expect(speaking.output).toBeGreaterThan(speaking.input)
    expect(recording.input).toBeGreaterThan(recording.output)
  })

  it("never goes to zero while the interview is live", () => {
    // At zero the sphere freezes into a hard pinwheel that looks crashed.
    for (const state of ["listening", "recording", "thinking", "speaking"] as const) {
      const volumes = orbVolumes({ level: 0, state, voiceLevel: 0 })

      expect(volumes.input).toBeGreaterThan(0)
      expect(volumes.output).toBeGreaterThan(0)
    }
  })

  it("settles once the session is over or the microphone is off", () => {
    for (const state of ["idle", "muted"] as const) {
      const volumes = orbVolumes({ level: 0.9, state, voiceLevel: 0.9 })

      expect(volumes.output).toBeLessThan(0.2)
    }
  })

  it("rises with the voice and never past one", () => {
    const quiet = orbVolumes({ level: 0, state: "speaking", voiceLevel: 0.1 })
    const loud = orbVolumes({ level: 0, state: "speaking", voiceLevel: 1 })

    expect(loud.output).toBeGreaterThan(quiet.output)
    expect(loud.output).toBeLessThanOrEqual(1)
    expect(
      orbVolumes({ level: Number.NaN, state: "recording", voiceLevel: 0 }).input
    ).toBeGreaterThan(0)
  })
})
