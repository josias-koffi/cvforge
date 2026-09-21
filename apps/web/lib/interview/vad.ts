/**
 * Voice activity detection, as arithmetic rather than effects: the hook feeds
 * it one frame of samples at a time and acts on the decision. Keeping the rule
 * here is what makes "starts on speech, stops after silence" testable without
 * a microphone.
 *
 * Frames are *time-domain* samples (`getByteTimeDomainData`), centred on 128.
 * The first version read `getByteFrequencyData`, whose bytes are decibels
 * mapped through the analyser's `minDecibels`/`maxDecibels` — left at -100 and
 * -30. A 0.05 threshold there meant roughly -96 dB, which is digital silence:
 * no real room ever goes that quiet, so the silence counter never moved and a
 * turn never ended by itself. Amplitude is what the threshold always meant.
 */

/** Analyser window; 256 samples is plenty to tell speech from silence. */
export const VAD_FFT_SIZE = 256
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
 * A frame gap longer than this is a stall — a backgrounded tab, a long paint.
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
   * that turned out not to be an answer.
   */
  action: "start" | "stop" | "abort" | "none"
  reason: VadStopReason | null
}

export type VadInput = VadAccumulator & {
  /** Time-domain samples, 0-255 centred on 128. */
  frame: Uint8Array
  status: VadStatus
  /** Milliseconds since the previous frame. */
  deltaMs: number
  muted: boolean
}

/** What a caller starts a session with, and returns to between turns. */
export const initialVadAccumulator: VadAccumulator = {
  noiseFloor: INITIAL_NOISE_FLOOR,
  silenceMs: 0,
  speechMs: 0,
}

/** Loudness of one frame as amplitude, 0-1. */
export function computeAmplitudeRms(frame: Uint8Array): number {
  if (frame.length === 0) return 0

  let sumOfSquares = 0
  for (let index = 0; index < frame.length; index += 1) {
    const centered = ((frame[index] ?? 128) - 128) / 128
    sumOfSquares += centered * centered
  }

  return Math.sqrt(sumOfSquares / frame.length)
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
 * The next VAD state for one frame.
 *
 * Only `listening` starts a recording and only `recording` ends one:
 * `processing` is the window where an answer is being answered, and reacting
 * to sound there would record the interviewer's own voice.
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

/**
 * Peak deviation from the centre line, 0-1: it tracks a voice legibly on a
 * meter where an RMS would barely move.
 *
 * Shared by the microphone loop and the interviewer's voice, so the orb
 * breathes at the same scale whoever is talking.
 */
export function computeLevel(frame: Uint8Array) {
  let peak = 0
  for (let index = 0; index < frame.length; index += 1) {
    peak = Math.max(peak, Math.abs((frame[index] ?? 128) - 128))
  }

  return Math.round((peak / 128) * 100) / 100
}
