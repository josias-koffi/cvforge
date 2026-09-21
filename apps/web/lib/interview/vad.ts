/**
 * Voice activity detection, as arithmetic rather than effects: the hook feeds
 * it one frame of samples at a time and acts on the decision. Keeping the rule
 * here is what makes "starts on speech, stops after silence" testable without
 * a microphone.
 *
 * Every threshold below is an amplitude on the scale `analyser` measures, so
 * the microphone and the interviewer's own voice can be compared directly.
 */

import { computeAmplitudeRms } from "@/lib/interview/analyser"

/**
 * How often the detector samples, in milliseconds.
 *
 * A timer, not `requestAnimationFrame`. Speech detection has no business
 * depending on the frame rate: rAF is throttled by whatever else is painting,
 * and the studio draws a shader-driven sphere beside it.
 */
export const VAD_INTERVAL_MS = 25
/** Amplitude that opens a recording. */
export const SPEECH_START_RMS = 0.045
/** Amplitude that keeps one open: a trailing syllable is not silence. */
export const SPEECH_CONTINUE_RMS = 0.02
/** How far above the measured room tone the onset must sit. */
export const NOISE_FLOOR_MARGIN = 2.5
/** Silence that ends an answer once the candidate is clearly under way. */
export const SILENCE_MS_TO_STOP = 1500
/**
 * Silence tolerated while the answer is still being searched for.
 *
 * An interview question is not chat: "alors... euh..." while someone gathers
 * an example is the normal opening of a considered answer, and cutting it off
 * hands the floor back to an interviewer who then moves on. Patience costs a
 * second of dead air; impatience costs the answer.
 */
export const SILENCE_MS_WHILE_SEARCHING = 2800
/** Speech below this is still a false start, not an answer under way. */
export const SETTLED_SPEECH_MS = 2000
/** Below this, a burst was a cough or a chair, not an answer. */
export const MIN_SPEECH_MS = 400
/** Nothing else ever stops a recording, so something has to. */
export const MAX_ANSWER_MS = 90_000

/**
 * How much louder than a normal onset the candidate must be to cut the
 * interviewer off. Talking over someone is deliberate; it should take
 * deliberate volume.
 */
export const BARGE_IN_RMS_MARGIN = 1.6
/** And long enough to be a word rather than a chair or a cough. */
export const BARGE_IN_SPEECH_MS = 280
/**
 * The echo guard, and the one that decides whether this feature is usable.
 *
 * `getUserMedia` cancels echo, but never perfectly — on external speakers at
 * volume, some of the interviewer's own voice comes back down the microphone.
 * Without this, the recruiter interrupts itself on its own first word and the
 * interview is over. The candidate has to be at least this loud *relative to
 * what the speakers are putting out*, measured the same way on both sides.
 */
export const BARGE_IN_ECHO_RATIO = 0.6
/**
 * A gap longer than this is a stall — a backgrounded tab, a long paint.
 * Counting it in full would end the answer on a hiccup.
 */
export const MAX_FRAME_DELTA_MS = 100

/** Where the room tone starts before a single frame has been measured. */
const INITIAL_NOISE_FLOOR = 0.005
/** How fast the floor follows the room. Slow on purpose: it must not chase speech. */
const NOISE_FLOOR_RISE = 0.02
const NOISE_FLOOR_FALL = 0.2
/** The floor is a room, not a voice; past this it is measuring the candidate. */
const MAX_NOISE_FLOOR = 0.05

export type VadStatus = "listening" | "recording" | "processing" | "muted"

/** Why a recording ended, so the caller can tell a real answer from a runaway. */
export type VadStopReason = "silence" | "max-duration"

/** The part of the decision that has to survive to the next frame. */
export type VadAccumulator = {
  /** Consecutive silence, reset by any speech. */
  silenceMs: number
  /** Speech only — silent frames are not counted, so a cough stays short. */
  speechMs: number
  noiseFloor: number
}

export type VadDecision = VadAccumulator & {
  status: VadStatus
  /**
   * What the hook should do about it, if anything. `abort` throws the
   * recording away instead of sending it: the microphone opened on a noise
   * that turned out not to be an answer. `barge-in` cuts the interviewer off
   * and starts recording in the same breath.
   */
  action: "start" | "stop" | "abort" | "barge-in" | "none"
  reason: VadStopReason | null
}

export type VadInput = VadAccumulator & {
  /** Time-domain samples, 0-255 centred on 128. */
  frame: Uint8Array
  status: VadStatus
  /** Milliseconds since the previous frame. */
  deltaMs: number
  muted: boolean
  /**
   * Loudness of what the speakers are putting out, on the same scale as the
   * microphone's. Zero when the interviewer is not talking.
   */
  voiceRms: number
}

/** What a caller starts a session with, and returns to between turns. */
export const initialVadAccumulator: VadAccumulator = {
  noiseFloor: INITIAL_NOISE_FLOOR,
  silenceMs: 0,
  speechMs: 0,
}

/**
 * The room tone, tracked while nobody is speaking.
 *
 * It falls quickly and rises slowly, so a passing lorry lifts the bar for a
 * moment without a spoken answer dragging it up for the rest of the session.
 */
export function nextNoiseFloor(
  current: number,
  rms: number,
  isSpeech: boolean
): number {
  if (isSpeech) return current

  const weight = rms > current ? NOISE_FLOOR_RISE : NOISE_FLOOR_FALL

  return Math.min(current + (rms - current) * weight, MAX_NOISE_FLOOR)
}

/** The onset threshold for a given room. */
export function resolveStartThreshold(noiseFloor: number): number {
  return Math.max(SPEECH_START_RMS, noiseFloor * NOISE_FLOOR_MARGIN)
}

/**
 * How long to wait before deciding the answer is over.
 *
 * Longer while the candidate has barely started: those first seconds are where
 * the searching happens, and a pause there means thinking, not finishing.
 */
export function resolveSilenceBudget(speechMs: number): number {
  return speechMs >= SETTLED_SPEECH_MS
    ? SILENCE_MS_TO_STOP
    : SILENCE_MS_WHILE_SEARCHING
}

/**
 * Whether the candidate is talking over the interviewer on purpose.
 *
 * Three conditions, all required, because the cost of a false positive is the
 * recruiter cutting itself off mid-question: loud enough against this room's
 * own onset threshold, sustained long enough to be a word, and loud enough
 * relative to the speakers that it cannot be echo coming back in.
 */
export function shouldBargeIn({
  rms,
  noiseFloor,
  voiceRms,
  speechMs,
}: {
  rms: number
  noiseFloor: number
  voiceRms: number
  speechMs: number
}): boolean {
  return (
    speechMs >= BARGE_IN_SPEECH_MS &&
    rms > resolveStartThreshold(noiseFloor) * BARGE_IN_RMS_MARGIN &&
    rms > voiceRms * BARGE_IN_ECHO_RATIO
  )
}

/**
 * The next VAD state for one frame.
 *
 * Only `listening` starts a recording and only `recording` ends one.
 * `processing` is the window where an answer is being answered: sound there is
 * the interviewer's own voice far more often than not, so it takes the
 * deliberate effort of `shouldBargeIn` to be treated as the candidate.
 */
export function nextVadDecision(input: VadInput): VadDecision {
  const rms = computeAmplitudeRms(input.frame)
  const elapsedMs = Math.min(Math.max(input.deltaMs, 0), MAX_FRAME_DELTA_MS)

  if (input.muted) {
    return { ...initialVadAccumulator, action: "none", reason: null, status: "muted" }
  }

  if (input.status === "listening") {
    const noiseFloor = nextNoiseFloor(input.noiseFloor, rms, false)

    return rms > resolveStartThreshold(noiseFloor)
      ? {
          action: "start",
          noiseFloor,
          reason: null,
          silenceMs: 0,
          speechMs: 0,
          status: "recording",
        }
      : { ...initialVadAccumulator, action: "none", noiseFloor, reason: null, status: "listening" }
  }

  if (input.status === "recording") {
    return decideWhileRecording(input, rms, elapsedMs)
  }

  if (input.status === "processing") {
    return decideWhileProcessing(input, rms, elapsedMs)
  }

  return {
    action: "none",
    noiseFloor: input.noiseFloor,
    reason: null,
    silenceMs: input.silenceMs,
    speechMs: input.speechMs,
    status: input.status,
  }
}

/**
 * Listens under the interviewer's voice for the candidate cutting in.
 *
 * The run of loud speech resets the moment it drops back, so a burst has to be
 * continuous to count — the noise floor is left alone throughout, since what
 * the microphone hears here is mostly the speakers and measuring the room off
 * that would poison the threshold for the next answer.
 */
function decideWhileProcessing(
  input: VadInput,
  rms: number,
  elapsedMs: number
): VadDecision {
  const loud = rms > resolveStartThreshold(input.noiseFloor) * BARGE_IN_RMS_MARGIN
  const speechMs = loud ? input.speechMs + elapsedMs : 0
  const unchanged = {
    noiseFloor: input.noiseFloor,
    reason: null,
    silenceMs: 0,
  }

  if (
    shouldBargeIn({
      noiseFloor: input.noiseFloor,
      rms,
      speechMs,
      voiceRms: input.voiceRms,
    })
  ) {
    // The floor is the candidate's again, and the run that earned it is the
    // start of the answer, not something to carry into the next decision.
    return { ...unchanged, action: "barge-in", speechMs: 0, status: "recording" }
  }

  return { ...unchanged, action: "none", speechMs, status: "processing" }
}

/**
 * Hysteresis: it takes `SPEECH_START_RMS` to open a recording but only
 * `SPEECH_CONTINUE_RMS` to hold it. One threshold for both chopped answers
 * into pieces on every soft syllable.
 */
function decideWhileRecording(
  input: VadInput,
  rms: number,
  elapsedMs: number
): VadDecision {
  const isSpeech = rms > SPEECH_CONTINUE_RMS
  const speechMs = isSpeech ? input.speechMs + elapsedMs : input.speechMs
  const silenceMs = isSpeech ? 0 : input.silenceMs + elapsedMs
  const noiseFloor = nextNoiseFloor(input.noiseFloor, rms, isSpeech)

  const ended = { ...initialVadAccumulator, noiseFloor, status: "processing" as const }

  // Someone talking for this long is not waiting for a question; send it
  // rather than buffer forever, which is what used to happen.
  if (speechMs >= MAX_ANSWER_MS) {
    return { ...ended, action: "stop", reason: "max-duration" }
  }

  if (silenceMs >= resolveSilenceBudget(speechMs)) {
    // A cough is loud and brief. Sending it would have the interviewer answer
    // a noise, so the recording is dropped and the floor stays with the
    // candidate.
    return speechMs >= MIN_SPEECH_MS
      ? { ...ended, action: "stop", reason: "silence" }
      : {
          ...initialVadAccumulator,
          action: "abort",
          noiseFloor,
          reason: null,
          status: "listening",
        }
  }

  return { action: "none", noiseFloor, reason: null, silenceMs, speechMs, status: "recording" }
}
