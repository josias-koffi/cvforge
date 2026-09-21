import { describe, expect, it } from "vitest"

import {
  CAPTURE_CHUNK_MS,
  chunkSampleCount,
  createCaptureBatcher,
} from "@/lib/interview/capture"

/** A ramp, so a sample says where in the stream it came from. */
const ramp = (from: number, length: number) =>
  Float32Array.from({ length }, (_, index) => from + index)

const flatten = (chunks: Float32Array[]) =>
  chunks.flatMap((chunk) => Array.from(chunk))

describe("chunkSampleCount", () => {
  it("is the chunk duration at the device's own rate", () => {
    expect(chunkSampleCount(48_000, 250)).toBe(12_000)
    expect(chunkSampleCount(44_100, 250)).toBe(11_025)
  })

  it("defaults to the capture chunk, and never to nothing", () => {
    expect(chunkSampleCount(48_000)).toBe((48_000 * CAPTURE_CHUNK_MS) / 1000)
    expect(chunkSampleCount(1)).toBe(1)
  })
})

describe("createCaptureBatcher", () => {
  it("holds everything back until a chunk is complete", () => {
    const batcher = createCaptureBatcher(10)

    expect(batcher.push(ramp(0, 4))).toEqual([])
    expect(batcher.push(ramp(4, 5))).toEqual([])
    expect(flatten(batcher.push(ramp(9, 1)))).toEqual(flatten([ramp(0, 10)]))
  })

  it("emits several chunks from one oversized frame", () => {
    const batcher = createCaptureBatcher(4)

    const chunks = batcher.push(ramp(0, 10))

    expect(chunks).toHaveLength(2)
    expect(flatten(chunks)).toEqual(flatten([ramp(0, 8)]))
    // The odd two are held for the next frame, not dropped.
    expect(Array.from(batcher.drain() ?? [])).toEqual([8, 9])
  })

  it("loses no sample across frames of awkward sizes", () => {
    // Worklet frames do not divide into chunks, and the boundary is where a
    // batcher drops or repeats audio.
    const batcher = createCaptureBatcher(7)
    const played: number[] = []
    let next = 0

    for (const size of [1, 5, 13, 2, 9, 3, 11, 4]) {
      played.push(...flatten(batcher.push(ramp(next, size))))
      next += size
    }
    played.push(...Array.from(batcher.drain() ?? []))

    expect(played).toEqual(Array.from({ length: next }, (_, i) => i))
  })

  it("has nothing left to drain once an answer is sent", () => {
    const batcher = createCaptureBatcher(4)

    batcher.push(ramp(0, 8))

    expect(batcher.drain()).toBeNull()
  })

  it("ignores an empty frame rather than emitting an empty chunk", () => {
    const batcher = createCaptureBatcher(4)

    expect(batcher.push(new Float32Array(0))).toEqual([])
    expect(batcher.drain()).toBeNull()
  })

  it("starts the next answer clean after a reset", () => {
    // Otherwise the tail of an abandoned answer opens the next one.
    const batcher = createCaptureBatcher(4)

    batcher.push(ramp(0, 3))
    batcher.reset()

    expect(batcher.drain()).toBeNull()
    expect(flatten(batcher.push(ramp(100, 4)))).toEqual([100, 101, 102, 103])
  })
})
