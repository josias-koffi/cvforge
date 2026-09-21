/**
 * Voice activity detection, as arithmetic rather than effects: the hook feeds
 * it one frame of frequency data at a time and acts on the decision. Keeping
 * the rule here is what makes "starts on speech, stops after silence"
 * testable without a microphone.
 */

/** Root-mean-square above which a frame counts as speech. */
export const VAD_THRESHOLD = 0.05
/** Analyser window; 256 bins is plenty to tell speech from silence. */
export const VAD_FFT_SIZE = 256
/** Consecutive silent frames before an answer is considered finished. */
export const SILENCE_FRAMES_TO_STOP = 45

export type VadStatus = "listening" | "recording" | "processing" | "muted"

export type VadDecision = {
  status: VadStatus
  silenceFrames: number
  /** What the hook should do about it, if anything. */
  action: "start" | "stop" | "none"
}

export type VadInput = {
  /** Byte frequency data, 0-255 per bin. */
  frame: Uint8Array
  status: VadStatus
  silenceFrames: number
  muted: boolean
}

/** Loudness of one frame, normalised to 0-1. */
export function computeRms(frame: Uint8Array): number {
  if (frame.length === 0) return 0

  let sumOfSquares = 0
  for (let index = 0; index < frame.length; index += 1) {
    const normalized = (frame[index] ?? 0) / 255
    sumOfSquares += normalized * normalized
  }

  return Math.sqrt(sumOfSquares / frame.length)
}

/**
 * The next VAD state for one frame.
 *
 * Only `listening` starts a recording and only `recording` ends one:
 * `processing` is the window where a segment is being transcribed, and
 * reacting to sound there would cut the candidate off mid-upload.
 */
export function nextVadDecision(input: VadInput): VadDecision {
  const rms = computeRms(input.frame)

  if (input.muted) {
    return { status: "muted", silenceFrames: 0, action: "none" }
  }

  if (input.status === "listening") {
    return rms > VAD_THRESHOLD
      ? { status: "recording", silenceFrames: 0, action: "start" }
      : { status: "listening", silenceFrames: 0, action: "none" }
  }

  if (input.status === "recording") {
    if (rms > VAD_THRESHOLD) {
      // Any speech resets the count: a pause mid-sentence is not the end.
      return { status: "recording", silenceFrames: 0, action: "none" }
    }

    const silenceFrames = input.silenceFrames + 1

    return silenceFrames >= SILENCE_FRAMES_TO_STOP
      ? { status: "processing", silenceFrames: 0, action: "stop" }
      : { status: "recording", silenceFrames, action: "none" }
  }

  return {
    status: input.status,
    silenceFrames: input.silenceFrames,
    action: "none",
  }
}
