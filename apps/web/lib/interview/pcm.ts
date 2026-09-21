/**
 * The interviewer's voice arrives as raw PCM16, base64-encoded, while it is
 * still being generated.
 *
 * The frames are not self-contained. They are one continuous byte stream cut
 * wherever the network happened to cut it, so a frame can end in the middle of
 * a base64 group *and* in the middle of a 16-bit sample. Decoding each one on
 * its own therefore does not work: `atob` refuses a length that is not a
 * multiple of four, and dropping a trailing half sample shifts everything that
 * follows by one byte, which is heard as a burst of static rather than as the
 * click it was meant to avoid. OpenRouter's own guide joins the chunks before
 * decoding for exactly this reason.
 *
 * Hence a decoder that carries the remainder across frames, one per stream.
 */

/** What OpenAI's audio models emit, and what the player assumes. */
export const VOICE_SAMPLE_RATE = 24000

/**
 * Spelled with its buffer type: an unparameterised `Uint8Array` widens to
 * `SharedArrayBuffer`, which nothing here ever produces.
 */
type Bytes = Uint8Array<ArrayBuffer>

export function decodeBase64(value: string): Bytes {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

/**
 * Signed 16-bit little-endian samples to the floats Web Audio wants.
 *
 * Expects a whole number of samples: an odd byte belongs to the next frame and
 * is the decoder's business, not this function's.
 */
export function pcm16ToFloat32(bytes: Uint8Array): Float32Array {
  const sampleCount = Math.floor(bytes.length / 2)
  const samples = new Float32Array(sampleCount)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  for (let index = 0; index < sampleCount; index += 1) {
    const sample = view.getInt16(index * 2, true)
    // Asymmetric on purpose: -32768 is one step further from zero than 32767.
    samples[index] = sample < 0 ? sample / 0x8000 : sample / 0x7fff
  }

  return samples
}

function concat(left: Bytes, right: Bytes): Bytes {
  if (left.length === 0) return right
  if (right.length === 0) return left

  const joined = new Uint8Array(left.length + right.length)
  joined.set(left)
  joined.set(right, left.length)

  return joined
}

/**
 * Decodes a run of whole base64 groups.
 *
 * `atob` only tolerates padding at the very end of a string, and a stream can
 * carry a padded group mid-way when the model closes one buffer and opens the
 * next. Each padded group is therefore decoded as its own terminal string. The
 * common case — no padding at all — takes the single-call path.
 */
function decodeGroups(chars: string): Bytes {
  if (chars.length === 0) return new Uint8Array(0)
  if (!chars.includes("=")) return decodeBase64(chars)

  let bytes = new Uint8Array(0)
  let start = 0

  for (let index = 0; index < chars.length; index += 4) {
    if (!chars.slice(index, index + 4).includes("=")) continue

    bytes = concat(bytes, decodeBase64(chars.slice(start, index + 4)))
    start = index + 4
  }

  return concat(bytes, decodeGroups(chars.slice(start)))
}

export type VoiceFrameDecoder = {
  /** Every whole sample this frame completes, the carried remainder included. */
  push(base64: string): Float32Array
  /** What is still waiting on the next frame; non-zero means an unaligned cut. */
  pending(): { chars: number; bytes: number }
  reset(): void
}

/**
 * One decoder per stream.
 *
 * `reset` between turns matters: a remainder left over from an abandoned reply
 * would shift the start of the next one by a byte and turn it into static.
 */
export function createVoiceFrameDecoder(): VoiceFrameDecoder {
  let carryChars = ""
  let carryBytes = new Uint8Array(0)

  return {
    push(base64) {
      const chars = carryChars + base64
      const aligned = chars.length - (chars.length % 4)
      carryChars = chars.slice(aligned)

      const bytes = concat(carryBytes, decodeGroups(chars.slice(0, aligned)))
      const wholeBytes = bytes.length - (bytes.length % 2)
      // Copied rather than kept as a view, so the frame's buffer is free to go.
      carryBytes = bytes.slice(wholeBytes)

      return pcm16ToFloat32(bytes.subarray(0, wholeBytes))
    },

    pending() {
      return { bytes: carryBytes.length, chars: carryChars.length }
    },

    reset() {
      carryChars = ""
      carryBytes = new Uint8Array(0)
    },
  }
}

/** How long a frame lasts, to schedule the next one back to back. */
export function frameDurationSeconds(samples: Float32Array) {
  return samples.length / VOICE_SAMPLE_RATE
}
