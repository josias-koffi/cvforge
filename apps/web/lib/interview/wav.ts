/**
 * The studio uploads 16 kHz mono WAV: it is what the speech-to-text models
 * expect, and re-encoding in the browser keeps the payload a fraction of the
 * raw recording. Ported from the v1 studio, minus its React entanglement, so
 * the maths can be tested without a DOM.
 */

/** Anything above this is downsampled; anything at or below is left alone. */
export const TARGET_SAMPLE_RATE = 16000

const HEADER_BYTES = 44
const BITS_PER_SAMPLE = 16
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}

/** A canonical 44-byte PCM header for mono 16-bit audio. */
export function writeWavHeader(
  view: DataView,
  sampleCount: number,
  sampleRate: number
) {
  const dataSize = sampleCount * BYTES_PER_SAMPLE

  writeAscii(view, 0, "RIFF")
  view.setUint32(4, 36 + dataSize, true)
  writeAscii(view, 8, "WAVE")
  writeAscii(view, 12, "fmt ")
  view.setUint32(16, 16, true) // chunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * BYTES_PER_SAMPLE, true) // byte rate
  view.setUint16(32, BYTES_PER_SAMPLE, true) // block align
  view.setUint16(34, BITS_PER_SAMPLE, true)
  writeAscii(view, 36, "data")
  view.setUint32(40, dataSize, true)
}

/**
 * What comes out of the resampler for a given device.
 *
 * A device already at or below the target is left alone, so the WAV header
 * has to be written against this rather than against the target.
 */
export function resolveTargetRate(inputSampleRate: number) {
  return Math.min(inputSampleRate, TARGET_SAMPLE_RATE)
}

/**
 * Averages each source window into one output sample. Cruder than a windowed
 * filter, and enough for speech at this ratio; the alternative was shipping a
 * resampling library for one call site.
 */
export function resampleMonoPcm(input: Float32Array, inputSampleRate: number) {
  if (inputSampleRate <= TARGET_SAMPLE_RATE) {
    return { pcm: input, sampleRate: inputSampleRate }
  }

  const ratio = inputSampleRate / TARGET_SAMPLE_RATE
  const outputLength = Math.max(1, Math.floor(input.length / ratio))
  const output = new Float32Array(outputLength)

  for (let index = 0; index < outputLength; index += 1) {
    const start = Math.floor(index * ratio)
    const end = Math.min(input.length, Math.floor((index + 1) * ratio))
    let sum = 0
    let count = 0

    for (let cursor = start; cursor < end; cursor += 1) {
      sum += input[cursor] ?? 0
      count += 1
    }

    output[index] = count > 0 ? sum / count : 0
  }

  return { pcm: output, sampleRate: TARGET_SAMPLE_RATE }
}

/**
 * Float samples in [-1, 1] to little-endian 16-bit, with no container.
 *
 * On its own because an answer now goes up in pieces while it is being
 * spoken: each piece is encoded as it comes, and the header is written once
 * over the assembled whole.
 */
export function encodePcm16(pcm: Float32Array): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(pcm.length * BYTES_PER_SAMPLE)
  const view = new DataView(bytes.buffer)

  for (let index = 0; index < pcm.length; index += 1) {
    // Clamped first: a sample past 1 wraps to a loud click once truncated.
    const sample = Math.max(-1, Math.min(1, pcm[index] ?? 0))
    view.setInt16(
      index * BYTES_PER_SAMPLE,
      sample < 0 ? sample * 0x8000 : sample * 0x7fff,
      true
    )
  }

  return bytes
}

/** Already-encoded samples to a complete WAV file. */
export function wrapPcm16InWav(
  samples: Uint8Array,
  sampleRate: number
): ArrayBuffer {
  const buffer = new ArrayBuffer(HEADER_BYTES + samples.length)

  writeWavHeader(
    new DataView(buffer),
    samples.length / BYTES_PER_SAMPLE,
    sampleRate
  )
  new Uint8Array(buffer).set(samples, HEADER_BYTES)

  return buffer
}

/** Float samples in [-1, 1] to a complete WAV file. */
export function encodeWav(pcm: Float32Array, sampleRate: number): ArrayBuffer {
  return wrapPcm16InWav(encodePcm16(pcm), sampleRate)
}

/** Chunked so a long answer does not blow the argument limit of `apply`. */
export function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const CHUNK = 0x8000
  let binary = ""

  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK))
  }

  return btoa(binary)
}

/** Downsamples to 16 kHz and returns the base64 WAV the API expects. */
export function encodeSegment(pcm: Float32Array, sampleRate: number) {
  const resampled = resampleMonoPcm(pcm, sampleRate)

  return toBase64(encodeWav(resampled.pcm, resampled.sampleRate))
}
