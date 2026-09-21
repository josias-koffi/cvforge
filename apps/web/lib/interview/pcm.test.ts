import { describe, expect, it } from "vitest"

import {
  VOICE_SAMPLE_RATE,
  decodeBase64,
  decodeVoiceFrame,
  frameDurationSeconds,
  pcm16ToFloat32,
} from "@/lib/interview/pcm"

/** Little-endian 16-bit samples, the way the stream delivers them. */
function pcmBytes(...samples: number[]) {
  const bytes = new Uint8Array(samples.length * 2)
  const view = new DataView(bytes.buffer)
  samples.forEach((sample, index) => view.setInt16(index * 2, sample, true))

  return bytes
}

const toBase64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...Array.from(bytes)))

describe("decodeBase64", () => {
  it("round-trips arbitrary bytes", () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 255])

    expect(Array.from(decodeBase64(toBase64(bytes)))).toEqual(
      Array.from(bytes)
    )
  })
})

describe("pcm16ToFloat32", () => {
  it("maps the full scale to [-1, 1]", () => {
    const samples = pcm16ToFloat32(pcmBytes(0, 32767, -32768))

    expect(samples[0]).toBe(0)
    expect(samples[1]).toBeCloseTo(1, 6)
    expect(samples[2]).toBeCloseTo(-1, 6)
  })

  it("scales negatives against 32768, not 32767", () => {
    // Otherwise the most negative sample overshoots -1 and clips audibly.
    const samples = pcm16ToFloat32(pcmBytes(-16384))

    expect(samples[0]).toBeCloseTo(-0.5, 6)
  })

  it("drops a trailing half sample instead of reading it as a whole one", () => {
    // A frame can end mid-sample; keeping the stray byte is heard as a click.
    const truncated = new Uint8Array([...pcmBytes(1000), 0x42])

    expect(pcm16ToFloat32(truncated)).toHaveLength(1)
  })

  it("returns nothing for an empty frame", () => {
    expect(pcm16ToFloat32(new Uint8Array(0))).toHaveLength(0)
  })

  it("reads little-endian, which is what the stream sends", () => {
    // 0x0100 little-endian is 1, big-endian would be 256.
    const samples = pcm16ToFloat32(new Uint8Array([0x01, 0x00]))

    expect(samples[0]).toBeCloseTo(1 / 0x7fff, 8)
  })
})

describe("decodeVoiceFrame", () => {
  it("turns a streamed frame into playable samples", () => {
    const samples = decodeVoiceFrame(toBase64(pcmBytes(0, 16384)))

    expect(samples).toHaveLength(2)
    expect(samples[1]).toBeCloseTo(0.5, 4)
  })
})

describe("frameDurationSeconds", () => {
  it("measures a frame against the voice sample rate", () => {
    expect(frameDurationSeconds(new Float32Array(VOICE_SAMPLE_RATE))).toBe(1)
    expect(frameDurationSeconds(new Float32Array(VOICE_SAMPLE_RATE / 2))).toBe(
      0.5
    )
  })

  it("is zero for an empty frame, so scheduling does not drift", () => {
    expect(frameDurationSeconds(new Float32Array(0))).toBe(0)
  })
})
