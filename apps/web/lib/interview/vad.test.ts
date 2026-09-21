import { describe, expect, it } from "vitest"

import {
  MAX_ANSWER_MS,
  MIN_SPEECH_MS,
  SETTLED_SPEECH_MS,
  VAD_FFT_SIZE,
  VAD_INTERVAL_MS,
  SILENCE_MS_TO_STOP,
  SILENCE_MS_WHILE_SEARCHING,
  SPEECH_START_RMS,
  computeAmplitudeRms,
  initialVadAccumulator,
  nextNoiseFloor,
  nextVadDecision,
  resolveStartThreshold,
  type VadAccumulator,
  type VadDecision,
  type VadStatus,
} from "@/lib/interview/vad"

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
/** A quiet room with the microphone open — the case that used to hang. */
const ROOM = frameAt(0.01)
/** Someone answering. */
const SPEECH = frameAt(0.15)
/** The tail of a word: under the onset, over the hold threshold. */
const TAIL = frameAt(0.03)

function decide(
  status: VadStatus,
  frame: Uint8Array,
  accumulator: Partial<VadAccumulator> = {},
  options: { deltaMs?: number; muted?: boolean } = {}
): VadDecision {
  return nextVadDecision({
    ...initialVadAccumulator,
    ...accumulator,
    deltaMs: options.deltaMs ?? 16,
    frame,
    muted: options.muted ?? false,
    status,
  })
}

/** Feeds the same frame repeatedly, as the animation loop does. */
function feed(
  status: VadStatus,
  frame: Uint8Array,
  times: number,
  deltaMs: number,
  from: Partial<VadAccumulator> = {}
) {
  let state: VadDecision = decide(status, frame, from, { deltaMs })

  for (let index = 1; index < times; index += 1) {
    if (state.action !== "none") return state
    state = decide(state.status, frame, state, { deltaMs })
  }

  return state
}

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

describe("nextVadDecision", () => {
  it("starts recording as soon as the candidate speaks", () => {
    expect(decide("listening", SPEECH).action).toBe("start")
  })

  it("ignores the tone of a quiet room", () => {
    // The whole point: with the old frequency-domain threshold this frame read
    // far above the bar, so recording started instantly and never stopped.
    expect(decide("listening", ROOM).action).toBe("none")
    expect(decide("listening", SILENT).action).toBe("none")
  })

  it("ends the answer after the silence window, whatever the frame rate", () => {
    // 90 frames of 10 ms and 28 of 33 ms are the same second of silence. The
    // old frame counter made this depend on the display's refresh rate.
    const fine = feed("recording", SILENT, 200, 10, { speechMs: 2000 })
    const coarse = feed("recording", SILENT, 200, 33, { speechMs: 2000 })

    expect(fine.action).toBe("stop")
    expect(coarse.action).toBe("stop")
    expect(fine.reason).toBe("silence")
  })

  it("does not end the answer one frame early", () => {
    const decision = decide(
      "recording",
      SILENT,
      { silenceMs: SILENCE_MS_TO_STOP - 20, speechMs: 2000 },
      { deltaMs: 10 }
    )

    expect(decision.action).toBe("none")
    expect(decision.status).toBe("recording")
  })

  it("holds the recording through the quiet tail of a word", () => {
    const decision = decide("recording", TAIL, { silenceMs: 800, speechMs: 2000 })

    expect(decision.action).toBe("none")
    expect(decision.silenceMs).toBe(0)
  })

  it("throws away a burst too short to be an answer", () => {
    // A cough, a chair, a door. Sending it would have the interviewer reply to
    // a noise and waste a turn.
    const decision = decide("recording", SILENT, {
      silenceMs: SILENCE_MS_WHILE_SEARCHING,
      speechMs: MIN_SPEECH_MS - 100,
    })

    expect(decision.action).toBe("abort")
    expect(decision.status).toBe("listening")
  })

  it("counts speech only, so silence cannot pad a cough into an answer", () => {
    const decision = decide("recording", SILENT, { silenceMs: 400, speechMs: 200 })

    expect(decision.speechMs).toBe(200)
    expect(decision.silenceMs).toBe(416)
  })

  it("waits out a hesitation at the start of an answer", () => {
    // "Alors... euh..." while the candidate gathers an example. Ending the
    // turn here hands the floor back and the interviewer moves on, which is
    // exactly what the first live test ran into.
    const decision = decide("recording", SILENT, {
      silenceMs: SILENCE_MS_TO_STOP + 100,
      speechMs: SETTLED_SPEECH_MS - 500,
    })

    expect(decision.action).toBe("none")
    expect(decision.status).toBe("recording")
  })

  it("does not wait forever on someone who never got going", () => {
    const decision = decide("recording", SILENT, {
      silenceMs: SILENCE_MS_WHILE_SEARCHING,
      speechMs: SETTLED_SPEECH_MS - 500,
    })

    expect(decision.action).toBe("stop")
    expect(decision.reason).toBe("silence")
  })

  it("is quicker to hand over once the answer is under way", () => {
    const decision = decide("recording", SILENT, {
      silenceMs: SILENCE_MS_TO_STOP,
      speechMs: SETTLED_SPEECH_MS,
    })

    expect(decision.action).toBe("stop")
  })

  it("stops a runaway answer rather than buffering it forever", () => {
    const decision = decide("recording", SPEECH, { speechMs: MAX_ANSWER_MS })

    expect(decision.action).toBe("stop")
    expect(decision.reason).toBe("max-duration")
  })

  it("does not let a stalled tab jump the silence counter", () => {
    // A backgrounded tab can hand back a delta of seconds. Counting it whole
    // would end the answer on a hiccup.
    const decision = decide(
      "recording",
      SILENT,
      { silenceMs: 0, speechMs: 2000 },
      { deltaMs: 5_000 }
    )

    expect(decision.silenceMs).toBe(100)
    expect(decision.action).toBe("none")
  })

  it("never starts while muted, however loud the room", () => {
    expect(decide("listening", SPEECH, {}, { muted: true })).toEqual({
      ...initialVadAccumulator,
      action: "none",
      reason: null,
      status: "muted",
    })
  })

  it("does nothing while the interviewer is answering", () => {
    // Reacting here would record the recruiter's own voice.
    expect(decide("processing", SPEECH).action).toBe("none")
    expect(decide("processing", SILENT, { silenceMs: 99 }).silenceMs).toBe(99)
  })
})

describe("the adaptive noise floor", () => {
  it("raises the bar in a noisy room", () => {
    const noisy = nextNoiseFloor(0.03, 0.04, false)

    expect(noisy).toBeGreaterThan(0.03)
    expect(resolveStartThreshold(noisy)).toBeGreaterThan(SPEECH_START_RMS)
  })

  it("never drops the bar below the fixed floor", () => {
    expect(resolveStartThreshold(0)).toBe(SPEECH_START_RMS)
  })

  it("does not chase the candidate's own voice", () => {
    expect(nextNoiseFloor(0.01, 0.4, true)).toBe(0.01)
  })

  it("is capped, so a loud room cannot deafen the detector", () => {
    let floor = 0.04
    for (let index = 0; index < 500; index += 1) floor = nextNoiseFloor(floor, 1, false)

    expect(floor).toBeLessThanOrEqual(0.05)
  })

  it("falls faster than it rises, so a passing lorry is forgotten", () => {
    const rise = nextNoiseFloor(0.01, 0.02, false) - 0.01
    const fall = 0.02 - nextNoiseFloor(0.02, 0.01, false)

    expect(fall).toBeGreaterThan(rise)
  })

  it("keeps a sustained room tone from ever starting a recording", () => {
    // The end-to-end proof: 300 frames of room noise, no recording.
    expect(feed("listening", ROOM, 300, 16).action).toBe("none")
  })
})

describe("sampling window", () => {
  // `getByteTimeDomainData` hands back only the most recent `fftSize` samples,
  // so anything spoken in the gap between two reads is never looked at. The
  // window has to be at least as long as that gap.
  //
  // It was 256 samples — 5.3 ms — read on `requestAnimationFrame`. At 60 fps
  // that listened to a third of the time; once a WebGL canvas pulled the page
  // to 5 fps it listened to 3% of it, fell between the syllables, and the
  // microphone went deaf.
  const LOWEST_LIKELY_SAMPLE_RATE = 44_100

  it("covers the gap between two samples, at any usual sample rate", () => {
    const windowMs = (VAD_FFT_SIZE / LOWEST_LIKELY_SAMPLE_RATE) * 1000

    expect(windowMs).toBeGreaterThanOrEqual(VAD_INTERVAL_MS)
  })

  it("samples often enough to catch the shortest burst it accepts", () => {
    // Nothing under MIN_SPEECH_MS counts as an answer, so sampling has to be
    // comfortably finer than that or a real answer reads as a cough.
    expect(VAD_INTERVAL_MS).toBeLessThan(MIN_SPEECH_MS / 4)
  })
})
