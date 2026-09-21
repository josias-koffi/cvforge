/**
 * Cutting the microphone into pieces small enough to send while the candidate
 * is still talking.
 *
 * The recorder used to hand over one blob at `onstop`, which meant decoding
 * it, resampling it and base64-ing a megabyte *after* the last word — all of
 * it inside the silence that follows. `MediaRecorder` with a `timeslice` does
 * not help: its blobs are WebM fragments and only the first carries a header,
 * so nothing can read one on its own. Raw samples from an `AudioWorklet` can
 * be, which is what this batches.
 *
 * Arithmetic only: the hook owns the worklet and the uploads.
 */

/**
 * How much speech goes up at a time.
 *
 * Short enough that the tail left at the end of an answer is negligible, long
 * enough that a minute of speech is a couple of hundred requests rather than
 * thousands.
 */
export const CAPTURE_CHUNK_MS = 250

/** How many source samples make one chunk, at whatever rate the device runs. */
export function chunkSampleCount(
  sampleRate: number,
  chunkMs: number = CAPTURE_CHUNK_MS
): number {
  return Math.max(1, Math.round((sampleRate * chunkMs) / 1000))
}

export type CaptureBatcher = {
  /** Adds one worklet frame and returns whatever chunks it completed. */
  push(frame: Float32Array): Float32Array[]
  /** The unsent remainder, or null. Emptied by the call. */
  drain(): Float32Array | null
  reset(): void
}

/**
 * One batcher per answer.
 *
 * Frames arrive at whatever size the worklet posts them; chunks leave at a
 * fixed size, so the last one of an answer is the only short one.
 */
export function createCaptureBatcher(chunkSamples: number): CaptureBatcher {
  let pending: Float32Array[] = []
  let pendingLength = 0

  /** Everything held, as one array. */
  function collect(): Float32Array {
    if (pending.length === 1) return pending[0] ?? new Float32Array(0)

    const joined = new Float32Array(pendingLength)
    let offset = 0
    for (const frame of pending) {
      joined.set(frame, offset)
      offset += frame.length
    }

    return joined
  }

  return {
    push(frame) {
      if (frame.length > 0) {
        pending.push(frame)
        pendingLength += frame.length
      }
      if (pendingLength < chunkSamples) return []

      const held = collect()
      const chunks: Float32Array[] = []
      let offset = 0

      while (held.length - offset >= chunkSamples) {
        chunks.push(held.subarray(offset, offset + chunkSamples))
        offset += chunkSamples
      }

      const remainder = held.subarray(offset)
      pending = remainder.length > 0 ? [remainder] : []
      pendingLength = remainder.length

      return chunks
    },

    drain() {
      if (pendingLength === 0) return null

      const remainder = collect()
      pending = []
      pendingLength = 0

      return remainder
    },

    reset() {
      pending = []
      pendingLength = 0
    },
  }
}
