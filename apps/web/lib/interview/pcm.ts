/**
 * The interviewer's voice arrives as raw PCM16 frames, base64-encoded, while
 * it is still being generated. These helpers turn one frame into something
 * the Web Audio API can play.
 */

/** What OpenAI's audio models emit, and what the player assumes. */
export const VOICE_SAMPLE_RATE = 24000

export function decodeBase64(value: string): Uint8Array {
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
 * An odd byte count means a sample was split across two frames; the trailing
 * byte is dropped rather than read as a whole sample, which would be heard as
 * a click.
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

/** One streamed frame to playable samples. */
export function decodeVoiceFrame(base64: string): Float32Array {
  return pcm16ToFloat32(decodeBase64(base64))
}

/** How long a frame lasts, to schedule the next one back to back. */
export function frameDurationSeconds(samples: Float32Array) {
  return samples.length / VOICE_SAMPLE_RATE
}
