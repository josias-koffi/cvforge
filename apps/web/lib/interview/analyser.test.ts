import { describe, expect, it } from "vitest"

import { ANALYSER_FFT_SIZE, computeLevel } from "@/lib/interview/analyser"
import { LEVEL_INTERVAL_MS } from "@/hooks/interview/use-realtime-call"

const FRAME_SIZE = 128

/**
 * A time-domain frame at a given amplitude, the way the analyser delivers it:
 * bytes swinging around 128. A square wave keeps the RMS exactly `amplitude`,
 * so the tests can talk in thresholds rather than in sample maths.
 */
function frameAt(amplitude: number) {
  const frame = new Uint8Array(FRAME_SIZE)
  const swing = Math.round(amplitude * 128)

  for (let index = 0; index < frame.length; index += 1) {
    frame[index] = index % 2 === 0 ? 128 + swing : 128 - swing
  }

  return frame
}

/** Digital silence: every sample sits on the centre line. */
const SILENT = new Uint8Array(FRAME_SIZE).fill(128)

describe("computeLevel", () => {
  it("tracks the peak, which is what reads on a meter", () => {
    expect(computeLevel(SILENT)).toBe(0)
    expect(computeLevel(frameAt(0.5))).toBeCloseTo(0.5, 2)
  })

  it("is the same scale whoever is talking, so the orb does not jump", () => {
    // The microphone loop and the player both feed it.
    expect(computeLevel(frameAt(1))).toBe(1)
  })
})

describe("sampling window", () => {
  // The window has to be at least as long as the gap between two reads, or
  // the meter shows a fraction of what was said.
  const LOWEST_LIKELY_SAMPLE_RATE = 44_100

  it("covers the gap between two reads, at any usual sample rate", () => {
    const windowMs = (ANALYSER_FFT_SIZE / LOWEST_LIKELY_SAMPLE_RATE) * 1000

    expect(windowMs).toBeGreaterThanOrEqual(LEVEL_INTERVAL_MS)
  })
})
