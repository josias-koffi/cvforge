import { describe, expect, it } from "vitest"

import {
  BARGE_IN_SPEECH_MS,
  MAX_ANSWER_MS,
  MIN_SPEECH_MS,
  SETTLED_SPEECH_MS,
  VAD_INTERVAL_MS,
  SILENCE_MS_TO_STOP,
  SILENCE_MS_WHILE_SEARCHING,
  SPEECH_START_RMS,
  initialVadAccumulator,
  nextNoiseFloor,
  nextVadDecision,
  resolveStartThreshold,
  shouldBargeIn,
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
  options: { deltaMs?: number; muted?: boolean; voiceRms?: number } = {}
): VadDecision {
  return nextVadDecision({
    ...initialVadAccumulator,
    ...accumulator,
    deltaMs: options.deltaMs ?? 16,
    frame,
    muted: options.muted ?? false,
    status,
    // Silent speakers by default: most cases have nothing playing.
    voiceRms: options.voiceRms ?? 0,
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

  it("sits through the interviewer's answer rather than recording it", () => {
    // A normal speaking level here is the recruiter, or its echo. Only a
    // sustained run well above the onset takes the floor back.
    expect(decide("processing", SPEECH).action).toBe("none")
    expect(decide("processing", SILENT).action).toBe("none")
    expect(decide("processing", ROOM, { speechMs: 5_000 }).action).toBe("none")
  })
})

describe("barge-in", () => {
  /** Clearly over the onset threshold once the 1.6 margin is applied. */
  const LOUD = frameAt(0.2)

  /** Feeds `ms` of the same frame while the interviewer is talking. */
  function talkOver(
    frame: Uint8Array,
    ms: number,
    voiceRms: number
  ): VadDecision {
    let decision = decide("processing", frame, {}, { deltaMs: 0, voiceRms })

    for (let elapsed = 0; elapsed < ms; elapsed += VAD_INTERVAL_MS) {
      decision = decide(
        "processing",
        frame,
        {
          noiseFloor: decision.noiseFloor,
          silenceMs: decision.silenceMs,
          speechMs: decision.speechMs,
        },
        { deltaMs: VAD_INTERVAL_MS, voiceRms }
      )
      if (decision.action === "barge-in") break
    }

    return decision
  }

  it("hands the floor back when the candidate talks over the recruiter", () => {
    const decision = talkOver(LOUD, BARGE_IN_SPEECH_MS + VAD_INTERVAL_MS, 0.02)

    expect(decision.action).toBe("barge-in")
    expect(decision.status).toBe("recording")
    // The run that earned the floor is not carried into the answer itself.
    expect(decision.speechMs).toBe(0)
  })

  it("does not cut in on the recruiter's own voice coming back", () => {
    // The echo guard, and the reason this feature is usable at all: without
    // it the interviewer interrupts itself on its own first word.
    const decision = talkOver(LOUD, 2_000, 0.5)

    expect(decision.action).toBe("none")
  })

  it("ignores a burst too short to be a word", () => {
    expect(talkOver(LOUD, BARGE_IN_SPEECH_MS / 2, 0.02).action).toBe("none")
  })

  it("tells the candidate from the echo by the speakers, not by the level", () => {
    // The same voice at the microphone either way. What separates them is
    // whether the speakers were loud enough to account for it.
    expect(talkOver(SPEECH, 2_000, 0.02).action).toBe("barge-in")
    expect(talkOver(SPEECH, 2_000, 0.4).action).toBe("none")
  })

  it("ignores a sound that is loud for the room but not deliberate", () => {
    // Over the onset threshold, under the margin talking over someone takes.
    expect(talkOver(frameAt(0.06), 2_000, 0).action).toBe("none")
  })

  it("needs the run to be continuous, not merely cumulative", () => {
    // A syllable, a gap, a syllable is the room, not someone cutting in.
    let decision = talkOver(LOUD, BARGE_IN_SPEECH_MS / 2, 0.02)
    decision = decide(
      "processing",
      SILENT,
      { noiseFloor: decision.noiseFloor, speechMs: decision.speechMs },
      { deltaMs: VAD_INTERVAL_MS, voiceRms: 0.02 }
    )

    expect(decision.speechMs).toBe(0)
  })
})

describe("shouldBargeIn", () => {
  const base = { noiseFloor: 0.005, rms: 0.2, speechMs: 500, voiceRms: 0.02 }

  it("requires all three conditions at once", () => {
    expect(shouldBargeIn(base)).toBe(true)
    expect(shouldBargeIn({ ...base, speechMs: 100 })).toBe(false)
    expect(shouldBargeIn({ ...base, rms: 0.05 })).toBe(false)
    expect(shouldBargeIn({ ...base, voiceRms: 0.9 })).toBe(false)
  })

  it("scales its threshold with the room, like the onset does", () => {
    // A noisy room needs more, not the same fixed number.
    expect(shouldBargeIn({ ...base, noiseFloor: 0.05 })).toBe(false)
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
