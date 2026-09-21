import { describe, expect, it } from "vitest"

import { orbAmplitude, orbState } from "@/lib/interview/orb"

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
    for (const phase of ["booting", "completed", "error"] as const) {
      expect(orbState({ muted: false, phase })).toBe("idle")
    }
  })
})

describe("orbAmplitude", () => {
  it("follows whoever holds the floor", () => {
    expect(
      orbAmplitude({ level: 0.2, state: "speaking", voiceLevel: 0.8 })
    ).toBe(0.8)
    expect(
      orbAmplitude({ level: 0.2, state: "recording", voiceLevel: 0.8 })
    ).toBe(0.2)
  })

  it("settles when nobody is talking", () => {
    expect(
      orbAmplitude({ level: 0.9, state: "thinking", voiceLevel: 0.9 })
    ).toBe(0)
  })

  it("never lets a stray reading blow the orb up", () => {
    expect(
      orbAmplitude({ level: 4, state: "recording", voiceLevel: 0 })
    ).toBe(1)
    expect(
      orbAmplitude({ level: Number.NaN, state: "recording", voiceLevel: 0 })
    ).toBe(0)
  })
})
