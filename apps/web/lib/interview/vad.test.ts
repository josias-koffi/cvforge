import { describe, expect, it } from "vitest"

import {
  SILENCE_FRAMES_TO_STOP,
  VAD_THRESHOLD,
  computeRms,
  nextVadDecision,
  type VadStatus,
} from "@/lib/interview/vad"

/** A frame whose RMS lands on `level` (0-1), since every bin is equal. */
const frameAt = (level: number) => new Uint8Array(32).fill(Math.round(level * 255))

const LOUD = frameAt(0.6)
const SILENT = frameAt(0)

function decide(
  status: VadStatus,
  frame: Uint8Array,
  silenceFrames = 0,
  muted = false
) {
  return nextVadDecision({ frame, muted, silenceFrames, status })
}

describe("computeRms", () => {
  it("is zero on silence and one at full scale", () => {
    expect(computeRms(SILENT)).toBe(0)
    expect(computeRms(new Uint8Array(8).fill(255))).toBe(1)
  })

  it("is zero on an empty frame rather than NaN", () => {
    expect(computeRms(new Uint8Array(0))).toBe(0)
  })
})

describe("nextVadDecision", () => {
  it("starts recording as soon as the candidate speaks", () => {
    expect(decide("listening", LOUD)).toEqual({
      status: "recording",
      silenceFrames: 0,
      action: "start",
    })
  })

  it("stays put while the room is quiet", () => {
    expect(decide("listening", SILENT).action).toBe("none")
  })

  it("counts silence but does not cut the answer short", () => {
    const decision = decide("recording", SILENT, 10)

    expect(decision).toEqual({
      status: "recording",
      silenceFrames: 11,
      action: "none",
    })
  })

  it("ends the answer after enough consecutive silent frames", () => {
    const decision = decide("recording", SILENT, SILENCE_FRAMES_TO_STOP - 1)

    expect(decision).toEqual({
      status: "processing",
      silenceFrames: 0,
      action: "stop",
    })
  })

  it("resets the count on any speech, so a pause mid-sentence is not an ending", () => {
    expect(decide("recording", LOUD, SILENCE_FRAMES_TO_STOP - 1)).toEqual({
      status: "recording",
      silenceFrames: 0,
      action: "none",
    })
  })

  it("never starts while muted, however loud the room", () => {
    expect(decide("listening", LOUD, 0, true)).toEqual({
      status: "muted",
      silenceFrames: 0,
      action: "none",
    })
  })

  it("does nothing while a segment is being transcribed", () => {
    // Reacting here would cut the candidate off mid-upload.
    expect(decide("processing", LOUD).action).toBe("none")
    expect(decide("processing", SILENT, 99).silenceFrames).toBe(99)
  })

  it("needs to be strictly over the threshold to call it speech", () => {
    // The threshold sits at 12.75/255; the nearest byte values straddle it.
    const justUnder = new Uint8Array(32).fill(12)
    const justOver = new Uint8Array(32).fill(13)

    expect(computeRms(justUnder)).toBeLessThan(VAD_THRESHOLD)
    expect(computeRms(justOver)).toBeGreaterThan(VAD_THRESHOLD)
    expect(decide("listening", justUnder).action).toBe("none")
    expect(decide("listening", justOver).action).toBe("start")
  })
})
