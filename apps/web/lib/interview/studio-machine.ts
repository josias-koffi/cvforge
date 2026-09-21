import type { InterviewMessage } from "@cvforge/types"

import type { VadStatus } from "@/lib/interview/vad"

/**
 * All of the studio's state transitions, as one pure reducer.
 *
 * The v1 studio held this in fourteen `useState` and twelve `useRef`, mutated
 * from `MediaRecorder` callbacks, a `requestAnimationFrame` loop and a stream
 * reader at once — which is why it ran to 1768 lines and could not be tested.
 * Here the hooks only translate browser events into these events.
 */

export type StudioPhase =
  | "booting"
  | "listening"
  | "recording"
  | "processing"
  | "speaking"
  | "completed"
  | "error"

export type StudioMessage = InterviewMessage & { pending?: boolean }

export type StudioState = {
  phase: StudioPhase
  vadStatus: VadStatus
  muted: boolean
  /** Latest microphone level, 0-1, for the visual meter. */
  level: number
  messages: StudioMessage[]
  /** The reply being streamed, before it is committed to `messages`. */
  streamingReply: string
  error: string | null
  /** Milliseconds from the end of the answer to the first reply token. */
  firstTokenMs: number | null
  /**
   * When the candidate stopped talking. The latency that matters starts here,
   * not at the request: encoding the answer and uploading it are part of the
   * silence they sit through.
   */
  answerEndedAtMs: number | null
}

export type StudioEvent =
  | { type: "MIC_READY" }
  | { type: "MIC_FAILED"; message: string }
  | { type: "LEVEL"; level: number }
  | { type: "SPEECH_START" }
  | { type: "SPEECH_END"; atMs: number }
  /** The noise that opened the microphone was not an answer. */
  | { type: "SPEECH_ABORTED" }
  | { type: "TRANSCRIBED"; text: string }
  | { type: "TRANSCRIBE_FAILED"; message: string }
  /** The interviewer is about to open the interview, before any audio. */
  | { type: "AI_OPENING" }
  /** A frame of the spoken reply — what the candidate actually hears. */
  | { type: "AI_AUDIO"; atMs: number }
  | { type: "AI_DELTA"; text: string; atMs: number }
  | { type: "AI_DONE" }
  /** The spoken reply has finished playing — only now is the mic safe. */
  | { type: "VOICE_DONE" }
  | { type: "AI_FAILED"; message: string }
  | { type: "MUTE_TOGGLED" }
  | { type: "FINISHED" }

export const initialStudioState: StudioState = {
  phase: "booting",
  vadStatus: "listening",
  muted: false,
  level: 0,
  messages: [],
  streamingReply: "",
  error: null,
  firstTokenMs: null,
  answerEndedAtMs: null,
}

/**
 * The wait the candidate actually sat through: from their last word to the
 * interviewer's first. Set once per turn — later frames are the reply
 * continuing, not the reply starting.
 *
 * Null when nothing preceded, as on the opening greeting.
 */
function sinceAnswer(state: StudioState, atMs: number): number | null {
  if (state.firstTokenMs !== null) return state.firstTokenMs
  if (state.answerEndedAtMs === null) return null

  return atMs - state.answerEndedAtMs
}

function withMessage(
  state: StudioState,
  message: StudioMessage
): StudioMessage[] {
  return [...state.messages, message]
}

export function studioReducer(
  state: StudioState,
  event: StudioEvent
): StudioState {
  // Nothing but a fresh start pulls the studio out of a finished session.
  if (state.phase === "completed" && event.type !== "MIC_READY") {
    return state
  }

  switch (event.type) {
    case "MIC_READY":
      return { ...state, phase: "listening", vadStatus: "listening", error: null }

    case "MIC_FAILED":
      return { ...state, phase: "error", error: event.message }

    case "LEVEL":
      return state.level === event.level
        ? state
        : { ...state, level: event.level }

    case "SPEECH_START":
      // Ignored unless the studio is actually waiting for an answer, so a
      // noise during transcription or a reply cannot start a recording.
      return state.phase === "listening"
        ? { ...state, phase: "recording", vadStatus: "recording" }
        : state

    case "SPEECH_END":
      return state.phase === "recording"
        ? {
            ...state,
            phase: "processing",
            vadStatus: "processing",
            streamingReply: "",
            firstTokenMs: null,
            answerEndedAtMs: event.atMs,
          }
        : state

    case "SPEECH_ABORTED":
      // A cough opened the microphone and nothing followed. The floor goes
      // straight back to the candidate: no upload, no turn, no error.
      return state.phase === "recording"
        ? { ...state, phase: "listening", vadStatus: "listening", level: 0 }
        : state

    case "TRANSCRIBED": {
      const text = event.text.trim()

      // Arrives while the interviewer is already speaking — transcription runs
      // beside the voice, not before it — so this only records what was said
      // and leaves the phase to the audio events.
      if (text.length === 0) return state

      return {
        ...state,
        messages: withMessage(state, {
          role: "user",
          content: text,
          timestamp: new Date().toISOString(),
        }),
      }
    }

    case "TRANSCRIBE_FAILED":
      // Recoverable: the candidate can simply speak again.
      return {
        ...state,
        phase: "listening",
        vadStatus: "listening",
        error: event.message,
      }

    case "AI_OPENING":
      // Shuts the microphone for the gap between asking for the greeting and
      // hearing it: a cough in that second would otherwise be recorded as an
      // answer to a question that has not been asked yet.
      return {
        ...state,
        phase: "processing",
        vadStatus: "processing",
        streamingReply: "",
        firstTokenMs: null,
        // The greeting follows no answer, so there is no wait to measure.
        answerEndedAtMs: null,
      }

    case "AI_AUDIO":
      return {
        ...state,
        phase: "speaking",
        vadStatus: "processing",
        firstTokenMs: sinceAnswer(state, event.atMs),
      }

    case "AI_DELTA":
      return {
        ...state,
        phase: "speaking",
        vadStatus: "processing",
        streamingReply: state.streamingReply + event.text,
        firstTokenMs: sinceAnswer(state, event.atMs),
      }

    case "AI_DONE": {
      const reply = state.streamingReply.trim()

      // The text is complete, the voice is not. Staying in `speaking` keeps
      // the microphone shut until `VOICE_DONE`: reopening it here let the
      // speakers feed the recruiter's own voice back in, and the candidate
      // could not get a word in edgeways.
      return {
        ...state,
        phase: "speaking",
        vadStatus: "processing",
        streamingReply: "",
        messages:
          reply.length === 0
            ? state.messages
            : withMessage(state, {
                role: "assistant",
                content: reply,
                timestamp: new Date().toISOString(),
              }),
      }
    }

    case "VOICE_DONE":
      // Only reopens the mic if the reply was what we were waiting on.
      return state.phase === "speaking"
        ? { ...state, phase: "listening", vadStatus: "listening" }
        : state

    case "AI_FAILED":
      // The turn is lost, the session is not: the mic reopens.
      return {
        ...state,
        phase: "listening",
        vadStatus: "listening",
        streamingReply: "",
        error: event.message,
      }

    case "MUTE_TOGGLED": {
      const muted = !state.muted

      return {
        ...state,
        muted,
        level: muted ? 0 : state.level,
        vadStatus: muted ? "muted" : "listening",
        // Muting mid-answer drops it rather than uploading half a sentence.
        phase: muted && state.phase === "recording" ? "listening" : state.phase,
      }
    }

    case "FINISHED":
      return { ...state, phase: "completed", vadStatus: "listening", level: 0 }

    default:
      return state
  }
}
