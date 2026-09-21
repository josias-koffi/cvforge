import { describe, expect, it } from "vitest"

import {
  TARGET_SAMPLE_RATE,
  encodePcm16,
  encodeSegment,
  encodeWav,
  resampleMonoPcm,
  resolveTargetRate,
  toBase64,
  wrapPcm16InWav,
  writeWavHeader,
} from "@/lib/interview/wav"

const ascii = (view: DataView, offset: number, length: number) =>
  Array.from({ length }, (_, i) => String.fromCharCode(view.getUint8(offset + i))).join("")

describe("writeWavHeader", () => {
  it("writes a canonical 16-bit mono header", () => {
    const view = new DataView(new ArrayBuffer(44))

    writeWavHeader(view, 100, 16000)

    expect(ascii(view, 0, 4)).toBe("RIFF")
    expect(ascii(view, 8, 4)).toBe("WAVE")
    expect(ascii(view, 12, 4)).toBe("fmt ")
    expect(ascii(view, 36, 4)).toBe("data")
    expect(view.getUint32(4, true)).toBe(36 + 200) // riff size
    expect(view.getUint16(20, true)).toBe(1) // PCM
    expect(view.getUint16(22, true)).toBe(1) // mono
    expect(view.getUint32(24, true)).toBe(16000)
    expect(view.getUint32(28, true)).toBe(32000) // byte rate
    expect(view.getUint16(32, true)).toBe(2) // block align
    expect(view.getUint16(34, true)).toBe(16) // bits
    expect(view.getUint32(40, true)).toBe(200) // data size
  })
})

describe("resampleMonoPcm", () => {
  it("averages each window when downsampling 48 kHz to 16 kHz", () => {
    const input = new Float32Array([0, 0.3, 0.6, 1, 0.5, 0])

    const { pcm, sampleRate } = resampleMonoPcm(input, 48000)

    expect(sampleRate).toBe(TARGET_SAMPLE_RATE)
    expect(pcm).toHaveLength(2)
    expect(pcm[0]).toBeCloseTo(0.3, 5) // (0 + 0.3 + 0.6) / 3
    expect(pcm[1]).toBeCloseTo(0.5, 5) // (1 + 0.5 + 0) / 3
  })

  it("leaves audio at or below the target rate untouched", () => {
    const input = new Float32Array([0.1, 0.2])

    for (const rate of [8000, TARGET_SAMPLE_RATE]) {
      const result = resampleMonoPcm(input, rate)

      expect(result.sampleRate).toBe(rate)
      expect(result.pcm).toBe(input)
    }
  })

  it("never returns an empty buffer for a very short clip", () => {
    const { pcm } = resampleMonoPcm(new Float32Array([0.5]), 48000)

    expect(pcm.length).toBeGreaterThan(0)
  })
})

describe("encodeWav", () => {
  it("sizes the file from the sample count", () => {
    const buffer = encodeWav(new Float32Array(10), 16000)

    expect(buffer.byteLength).toBe(44 + 20)
  })

  it("maps the full-scale range to signed 16-bit", () => {
    const view = new DataView(encodeWav(new Float32Array([0, 1, -1]), 16000))

    expect(view.getInt16(44, true)).toBe(0)
    expect(view.getInt16(46, true)).toBe(32767)
    expect(view.getInt16(48, true)).toBe(-32768)
  })

  it("clamps out-of-range samples instead of letting them wrap into a click", () => {
    const view = new DataView(encodeWav(new Float32Array([4, -4]), 16000))

    expect(view.getInt16(44, true)).toBe(32767)
    expect(view.getInt16(46, true)).toBe(-32768)
  })
})

describe("toBase64", () => {
  it("round-trips through atob", () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111])

    expect(atob(toBase64(bytes.buffer))).toBe("Hello")
  })

  it("handles a buffer larger than one chunk", () => {
    const bytes = new Uint8Array(0x8000 * 2 + 7).fill(65)

    expect(atob(toBase64(bytes.buffer))).toHaveLength(bytes.length)
  })
})

describe("encodeSegment", () => {
  it("produces a base64 WAV that starts with a RIFF header", () => {
    const base64 = encodeSegment(new Float32Array(48000).fill(0.2), 48000)
    const decoded = atob(base64)

    expect(decoded.slice(0, 4)).toBe("RIFF")
    expect(decoded.slice(8, 12)).toBe("WAVE")
    // One second at 48 kHz becomes one second at 16 kHz.
    expect(decoded.length).toBe(44 + TARGET_SAMPLE_RATE * 2)
  })
})

describe("encodePcm16", () => {
  it("writes little-endian samples with no container around them", () => {
    const bytes = encodePcm16(Float32Array.from([0, 0.5, -0.5]))
    const view = new DataView(bytes.buffer)

    expect(bytes).toHaveLength(6)
    expect(view.getInt16(0, true)).toBe(0)
    // Truncated, not rounded: `setInt16` drops the fraction.
    expect(view.getInt16(2, true)).toBe(Math.trunc(0.5 * 0x7fff))
    expect(view.getInt16(4, true)).toBe(-0x4000)
  })

  it("clamps rather than wrapping, which would be a loud click", () => {
    const view = new DataView(encodePcm16(Float32Array.from([2, -2])).buffer)

    expect(view.getInt16(0, true)).toBe(0x7fff)
    expect(view.getInt16(2, true)).toBe(-0x8000)
  })
})

describe("wrapPcm16InWav", () => {
  it("puts a header on samples encoded piece by piece", () => {
    // What the studio does now: each chunk is encoded while the candidate
    // talks, and only the header waits for the end.
    const pcm = Float32Array.from([0.25, -0.25, 0.75])

    expect(
      Array.from(new Uint8Array(wrapPcm16InWav(encodePcm16(pcm), 16000)))
    ).toEqual(Array.from(new Uint8Array(encodeWav(pcm, 16000))))
  })

  it("counts the samples, not the bytes, in the header", () => {
    const view = new DataView(wrapPcm16InWav(new Uint8Array(200), 16000))

    expect(view.getUint32(40, true)).toBe(200)
  })
})

describe("resolveTargetRate", () => {
  it("is the target for any device above it", () => {
    expect(resolveTargetRate(48000)).toBe(TARGET_SAMPLE_RATE)
    expect(resolveTargetRate(44100)).toBe(TARGET_SAMPLE_RATE)
  })

  it("leaves a device already below it alone", () => {
    // The header has to say what came out, not what was asked for.
    expect(resolveTargetRate(8000)).toBe(8000)
  })

  it("agrees with what the resampler actually returns", () => {
    for (const rate of [8000, 16000, 44100, 48000]) {
      expect(resampleMonoPcm(new Float32Array(64), rate).sampleRate).toBe(
        resolveTargetRate(rate)
      )
    }
  })
})
