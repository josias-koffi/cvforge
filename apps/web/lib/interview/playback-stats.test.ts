import { describe, expect, it } from "vitest"

import {
  createPlaybackStats,
  emptyPlaybackStats,
} from "@/lib/interview/playback-stats"

const frame = (leadMs: number, overrides: { underrun?: boolean; misaligned?: boolean } = {}) => ({
  leadMs,
  underrun: overrides.underrun ?? false,
  misaligned: overrides.misaligned ?? false,
})

describe("createPlaybackStats", () => {
  it("reports nothing before a frame has played", () => {
    expect(createPlaybackStats().snapshot()).toEqual(emptyPlaybackStats)
  })

  it("counts frames and keeps the worst margin of the turn", () => {
    const stats = createPlaybackStats()

    stats.record(frame(160))
    stats.record(frame(40))
    stats.record(frame(210))

    const snapshot = stats.snapshot()
    expect(snapshot.frames).toBe(3)
    expect(snapshot.leadMinMs).toBe(40)
    expect(snapshot.leadP50Ms).toBe(160)
  })

  it("takes the lower of the two middle leads rather than their mean", () => {
    // A mean would report a margin no frame ever had.
    const stats = createPlaybackStats()

    stats.record(frame(100))
    stats.record(frame(200))

    expect(stats.snapshot().leadP50Ms).toBe(100)
  })

  it("counts underruns and misaligned frames separately", () => {
    const stats = createPlaybackStats()

    stats.record(frame(10, { underrun: true }))
    stats.record(frame(180, { misaligned: true }))
    stats.record(frame(20, { underrun: true, misaligned: true }))

    const snapshot = stats.snapshot()
    expect(snapshot.underruns).toBe(2)
    expect(snapshot.misalignedFrames).toBe(2)
  })

  it("carries the encode and upload timings the server never sees", () => {
    const stats = createPlaybackStats()

    stats.markEncode(120)
    stats.markUpload(940)

    expect(stats.snapshot()).toMatchObject({ encodeMs: 120, uploadMs: 940 })
  })

  it("survives thousands of frames, which a long answer produces", () => {
    // `Math.min(...leads)` threw here; the minimum is tracked as it goes.
    const stats = createPlaybackStats()

    for (let index = 0; index < 200_000; index += 1) stats.record(frame(index + 1))

    expect(stats.snapshot().leadMinMs).toBe(1)
  })

  it("starts a turn from scratch after a reset", () => {
    const stats = createPlaybackStats()

    stats.record(frame(10, { underrun: true }))
    stats.markUpload(500)
    stats.reset()

    expect(stats.snapshot()).toEqual(emptyPlaybackStats)
  })
})
