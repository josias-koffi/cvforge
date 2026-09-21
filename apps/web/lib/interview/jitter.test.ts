import { describe, expect, it } from "vitest"

import {
  INITIAL_LEAD_MS,
  LEAD_GROWTH_MS,
  MAX_LEAD_MS,
  initialJitterState,
  scheduleFrame,
  type JitterState,
} from "@/lib/interview/jitter"

/** A frame of 20 ms, the order of magnitude the stream delivers. */
const FRAME_SECONDS = 0.02

/** Plays `count` frames arriving comfortably ahead of the speakers. */
function playInTime(count: number, from: JitterState = initialJitterState) {
  let state = from
  let now = 0
  const frames = []

  for (let index = 0; index < count; index += 1) {
    const frame = scheduleFrame(state, { durationSeconds: FRAME_SECONDS, now })
    frames.push(frame)
    state = frame.next
    now += FRAME_SECONDS
  }

  return { frames, state }
}

describe("scheduleFrame", () => {
  it("starts the first frame a margin ahead of the speakers", () => {
    const frame = scheduleFrame(initialJitterState, {
      durationSeconds: FRAME_SECONDS,
      now: 10,
    })

    expect(frame.startAt).toBeCloseTo(10 + INITIAL_LEAD_MS / 1000, 6)
    expect(frame.underrun).toBe(false)
    expect(frame.leadMs).toBeCloseTo(INITIAL_LEAD_MS, 6)
  })

  it("lays frames end to end, leaving no gap between them", () => {
    const { frames } = playInTime(5)

    for (let index = 1; index < frames.length; index += 1) {
      expect(frames[index]?.startAt).toBeCloseTo(
        (frames[index - 1]?.startAt ?? 0) + FRAME_SECONDS,
        6
      )
    }
  })

  it("leaves the margin alone while frames arrive on time", () => {
    expect(playInTime(20).state).toMatchObject({
      leadMs: INITIAL_LEAD_MS,
      underruns: 0,
    })
  })

  it("does not widen the margin just because it was nibbled at", () => {
    // A stream delivered at real time sits a hair under its target margin on
    // every frame and never leaves a gap. Treating that as an underrun drove
    // the window to its ceiling on a connection that was behaving.
    const nibbled = scheduleFrame(
      { leadMs: INITIAL_LEAD_MS, playhead: 10.1, underruns: 0 },
      { durationSeconds: FRAME_SECONDS, now: 10 }
    )

    expect(nibbled.underrun).toBe(false)
    expect(nibbled.next.leadMs).toBe(INITIAL_LEAD_MS)
    // Still pushed out to the full margin: that is how the buffer refills.
    expect(nibbled.startAt).toBeCloseTo(10 + INITIAL_LEAD_MS / 1000, 6)
  })

  it("widens the margin once the speakers have actually run dry", () => {
    const late = scheduleFrame(
      { leadMs: INITIAL_LEAD_MS, playhead: 9.8, underruns: 0 },
      { durationSeconds: FRAME_SECONDS, now: 10 }
    )

    expect(late.underrun).toBe(true)
    expect(late.next.underruns).toBe(1)
    expect(late.next.leadMs).toBe(INITIAL_LEAD_MS + LEAD_GROWTH_MS)
    expect(late.startAt).toBeCloseTo(10 + INITIAL_LEAD_MS / 1000, 6)
  })

  it("never lets the margin shrink again inside a turn", () => {
    // What made the old player reopen the same gap on every late frame.
    const widened = scheduleFrame(
      { leadMs: INITIAL_LEAD_MS, playhead: 4.8, underruns: 0 },
      { durationSeconds: FRAME_SECONDS, now: 5 }
    ).next

    expect(widened.leadMs).toBeGreaterThan(INITIAL_LEAD_MS)
    expect(playInTime(10, widened).state.leadMs).toBe(widened.leadMs)
  })

  it("stops widening at the ceiling, where the margin is its own problem", () => {
    let state: JitterState = { ...initialJitterState, playhead: 1 }

    for (let index = 0; index < 20; index += 1) {
      // Always a step past the playhead, so the queue is dry every time.
      state = scheduleFrame(state, {
        durationSeconds: FRAME_SECONDS,
        now: state.playhead + 0.01,
      }).next
    }

    expect(state.leadMs).toBe(MAX_LEAD_MS)
    expect(state.underruns).toBe(20)
  })

  it("does not count the opening frame as late", () => {
    expect(
      scheduleFrame(initialJitterState, { durationSeconds: FRAME_SECONDS, now: 0 })
        .underrun
    ).toBe(false)
  })
})
