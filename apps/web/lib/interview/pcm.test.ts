import { describe, expect, it } from "vitest"

import {
  VOICE_SAMPLE_RATE,
  createVoiceFrameDecoder,
  decodeBase64,
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

  it("returns nothing for an empty frame", () => {
    expect(pcm16ToFloat32(new Uint8Array(0))).toHaveLength(0)
  })

  it("reads little-endian, which is what the stream sends", () => {
    // 0x0100 little-endian is 1, big-endian would be 256.
    const samples = pcm16ToFloat32(new Uint8Array([0x01, 0x00]))

    expect(samples[0]).toBeCloseTo(1 / 0x7fff, 8)
  })
})

describe("createVoiceFrameDecoder", () => {
  /** A recognisable ramp, long enough to cut in many places. */
  const reference = pcmBytes(
    ...Array.from({ length: 1000 }, (_, index) => index * 30 - 15000)
  )
  const referenceBase64 = toBase64(reference)

  /** Pushes `chars`-wide slices of the stream and joins what comes back. */
  function playThrough(base64: string, chars: number) {
    const decoder = createVoiceFrameDecoder()
    const played: number[] = []

    for (let index = 0; index < base64.length; index += chars) {
      played.push(...decoder.push(base64.slice(index, index + chars)))
    }

    return { decoder, played }
  }

  it("turns a streamed frame into playable samples", () => {
    const samples = createVoiceFrameDecoder().push(toBase64(pcmBytes(0, 16384)))

    expect(samples).toHaveLength(2)
    expect(samples[1]).toBeCloseTo(0.5, 4)
  })

  it.each([7, 11, 13, 1, 2, 3, 5])(
    "reconstructs the stream exactly when cut every %i characters",
    (chars) => {
      // The cut lands mid-group and mid-sample by turns. Decoding each frame
      // on its own dropped bytes here and byte-swapped everything after them.
      const { decoder, played } = playThrough(referenceBase64, chars)

      expect(played).toEqual(Array.from(pcm16ToFloat32(reference)))
      expect(decoder.pending()).toEqual({ bytes: 0, chars: 0 })
    }
  )

  it("does not throw on a frame whose length leaves one character over", () => {
    // `atob` rejects that outright, and it used to take the whole turn down.
    const decoder = createVoiceFrameDecoder()

    expect(() => decoder.push(referenceBase64.slice(0, 5))).not.toThrow()
    expect(decoder.pending().chars).toBe(1)
  })

  it("holds a lone trailing byte back instead of dropping it", () => {
    const decoder = createVoiceFrameDecoder()
    // Three bytes: one whole sample, and half of the next.
    const first = decoder.push(toBase64(new Uint8Array([0x10, 0x20, 0x30])))

    expect(first).toHaveLength(1)
    expect(decoder.pending().bytes).toBe(1)

    // The held byte is the low half of this sample, not the high half of it.
    const second = decoder.push(toBase64(new Uint8Array([0x40])))
    expect(second[0]).toBeCloseTo(pcm16ToFloat32(pcmBytes(0x4030))[0] ?? 0, 8)
  })

  it("decodes a padded group that is not the last one", () => {
    // The model can close one buffer and open another mid-reply.
    const decoder = createVoiceFrameDecoder()
    const padded = toBase64(pcmBytes(1234)) + toBase64(pcmBytes(-4321))

    expect(Array.from(decoder.push(padded))).toEqual(
      Array.from(pcm16ToFloat32(pcmBytes(1234, -4321)))
    )
  })

  it("starts the next reply clean after a reset", () => {
    const decoder = createVoiceFrameDecoder()
    decoder.push(referenceBase64.slice(0, 7))
    decoder.reset()

    expect(decoder.pending()).toEqual({ bytes: 0, chars: 0 })
    expect(Array.from(decoder.push(toBase64(pcmBytes(16384))))).toEqual(
      Array.from(pcm16ToFloat32(pcmBytes(16384)))
    )
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
