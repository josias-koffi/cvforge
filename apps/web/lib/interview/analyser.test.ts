import { describe, expect, it } from "vitest"

import {
  ANALYSER_FFT_SIZE,
  computeAmplitudeRms,
  computeLevel,
} from "@/lib/interview/analyser"
import { MIN_SPEECH_MS, VAD_INTERVAL_MS } from "@/lib/interview/vad"

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

describe("computeAmplitudeRms", () => {
  it("is zero on the centre line and one at full swing", () => {
    expect(computeAmplitudeRms(SILENT)).toBe(0)
    expect(computeAmplitudeRms(frameAt(1))).toBe(1)
  })

  it("is zero on an empty frame rather than NaN", () => {
    expect(computeAmplitudeRms(new Uint8Array(0))).toBe(0)
  })

  it("reads a dip below the centre line as loudness, not as silence", () => {
    // Half a waveform sits under 128; treating those bytes as quiet would
    // halve every measurement.
    const belowOnly = new Uint8Array(FRAME_SIZE).fill(128 - 19)

    expect(computeAmplitudeRms(belowOnly)).toBeCloseTo(0.148, 2)
  })
})

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
  // the detector measures a fraction of what was said.
  //
  // It was 256 samples — 5.3 ms — read on `requestAnimationFrame`. At 60 fps
  // that listened to a third of the time; once a WebGL canvas pulled the page
  // to 5 fps it listened to 3% of it, fell between the syllables, and the
  // microphone went deaf.
  const LOWEST_LIKELY_SAMPLE_RATE = 44_100

  it("covers the gap between two samples, at any usual sample rate", () => {
    const windowMs = (ANALYSER_FFT_SIZE / LOWEST_LIKELY_SAMPLE_RATE) * 1000

    expect(windowMs).toBeGreaterThanOrEqual(VAD_INTERVAL_MS)
  })

  it("samples often enough to catch the shortest burst it accepts", () => {
    // Nothing under MIN_SPEECH_MS counts as an answer, so sampling has to be
    // comfortably finer than that or a real answer reads as a cough.
    expect(VAD_INTERVAL_MS).toBeLessThan(MIN_SPEECH_MS / 4)
  })
})
