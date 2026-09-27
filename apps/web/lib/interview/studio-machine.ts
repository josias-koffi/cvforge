import type { InterviewMessage } from "@cvforge/types"

/**
 * All of the studio's state transitions, as one pure reducer.
 *
 * The call itself runs between the browser and OpenAI over WebRTC (ADR-026):
 * turn detection, interruption and playback all happen there. The hook only
 * translates the call's events into these, and this decides what the
 * candidate sees.
 */

export type StudioPhase =
  | "booting"
  | "connecting"
  | "listening"
  | "recording"
  | "processing"
  | "speaking"
  /** The candidate paused: the call is hung up and the clock stopped. */
  | "paused"
  /** The call is over, by the recruiter's goodbye, the clock, or a drop. */
  | "ended"
  | "completed"
  | "error"

export type StudioMessage = InterviewMessage & {
  pending?: boolean
  /**
   * The call's own id for a spoken answer. Its words arrive after the
   * recruiter has often started replying, so the message holds its place in
   * the thread until they do.
   */
  itemId?: string
}

export type StudioState = {
  phase: StudioPhase
  muted: boolean
  /** Latest microphone level, 0-1, for the visual meter. */
  level: number
  /** Latest level of the interviewer's own voice, 0-1, on the same scale. */
  voiceLevel: number
  messages: StudioMessage[]
  /** The reply being spoken, before it is committed to `messages`. */
  streamingReply: string
  error: string | null
  /** Milliseconds from the end of the answer to the recruiter's first word. */
  firstTokenMs: number | null
  /** When the candidate stopped talking, as the call detected it. */
  answerEndedAtMs: number | null
  /**
   * When the interview actually began, as the server stamped it when the
   * call first connected. Null until then.
   */
  startedAt: string | null
  /** When the candidate paused, so the countdown stands still. Null otherwise. */
  pausedAt: string | null
  /**
   * The recruiter has nothing left to ask and has said goodbye.
   *
   * Decided by the server, which owns the agenda. The studio scores the
   * session on it rather than waiting out the clock.
   */
  concluded: boolean
}

export type StudioEvent =
  | { type: "CONNECTING" }
  | { type: "CONNECTED"; startedAt: string }
  | { type: "CONNECT_FAILED"; message: string }
  | { type: "MIC_FAILED"; message: string }
  | { type: "LEVEL"; level: number }
  /** A frame of the reply as it plays, so the orb breathes with the voice. */
  | { type: "VOICE_LEVEL"; level: number }
  /** The candidate started talking — possibly over the recruiter. */
  | { type: "USER_SPEECH_START" }
  | { type: "USER_SPEECH_END"; itemId: string; atMs: number }
  | { type: "TRANSCRIBED"; itemId: string; text: string }
  | { type: "AI_DELTA"; text: string }
  /** The recruiter's voice became audible. */
  | { type: "AI_AUDIO_STARTED"; atMs: number }
  | { type: "AI_DONE" }
  /** The voice has stopped playing — finished, or cut off. */
  | { type: "VOICE_DONE" }
  /** Something went wrong inside the call, without ending it. */
  | { type: "CALL_ERROR"; message: string }
  | { type: "CALL_ENDED"; concluded: boolean }
  /** The recruiter said goodbye and called `end_interview`. */
  | { type: "CONCLUDED" }
  /** The call was hung up for a pause; the server stopped the clock then. */
  | { type: "PAUSED"; pausedAt: string | null }
  | { type: "MUTE_TOGGLED" }
  | { type: "FINISHED" }
  /** The analysis failed: the interview is not over after all. */
  | { type: "FINISH_FAILED"; message: string }

export const initialStudioState: StudioState = {
  phase: "booting",
  muted: false,
  level: 0,
  voiceLevel: 0,
  messages: [],
  streamingReply: "",
  error: null,
  firstTokenMs: null,
  answerEndedAtMs: null,
  startedAt: null,
  pausedAt: null,
  concluded: false,
}

/** The phases in which the call is up and someone may speak. */
const LIVE_PHASES = new Set<StudioPhase>([
  "listening",
  "recording",
  "processing",
  "speaking",
])

function commitReply(state: StudioState): StudioMessage[] {
  const reply = state.streamingReply.trim()

  return reply.length === 0
    ? state.messages
    : [
        ...state.messages,
        { role: "assistant", content: reply, timestamp: new Date().toISOString() },
      ]
}

export function studioReducer(
  state: StudioState,
  event: StudioEvent
): StudioState {
  // Nothing but a failed analysis pulls the studio out of a finished session.
  if (state.phase === "completed" && event.type !== "FINISH_FAILED") {
    return state
  }

  switch (event.type) {
    case "CONNECTING":
      return { ...state, phase: "connecting", error: null }

    case "CONNECTED":
      return {
        ...state,
        phase: "listening",
        error: null,
        // The server's word, every time: coming back from a pause moves the
        // start forward by the length of the pause.
        startedAt: event.startedAt,
        pausedAt: null,
      }

    case "CONNECT_FAILED":
    case "MIC_FAILED":
      return { ...state, phase: "error", error: event.message }

    case "LEVEL":
      return state.level === event.level ? state : { ...state, level: event.level }

    case "VOICE_LEVEL":
      return state.voiceLevel === event.level
        ? state
        : { ...state, voiceLevel: event.level }

    case "USER_SPEECH_START":
      if (!LIVE_PHASES.has(state.phase)) return state

      // Talking over the recruiter: the call has already cut its voice, and
      // what it managed to say is kept — the candidate answered what they heard.
      return {
        ...state,
        phase: "recording",
        messages: commitReply(state),
        streamingReply: "",
        voiceLevel: 0,
      }

    case "USER_SPEECH_END":
      if (!LIVE_PHASES.has(state.phase)) return state

      return {
        ...state,
        phase: "processing",
        firstTokenMs: null,
        answerEndedAtMs: event.atMs,
        messages: [
          ...state.messages,
          {
            role: "user",
            content: "",
            itemId: event.itemId,
            pending: true,
            timestamp: new Date().toISOString(),
          },
        ],
      }

    case "TRANSCRIBED": {
      const text = event.text.trim()
      const index = state.messages.findIndex(
        (message) => message.itemId === event.itemId
      )

      if (index === -1) {
        return text.length === 0
          ? state
          : {
              ...state,
              messages: [
                ...state.messages,
                { role: "user", content: text, timestamp: new Date().toISOString() },
              ],
            }
      }

      // Filled in place, so the answer stays above the reply it prompted.
      return {
        ...state,
        messages:
          text.length === 0
            ? state.messages.filter((_, position) => position !== index)
            : state.messages.map((message, position) =>
                position === index
                  ? { ...message, content: text, pending: false }
                  : message
              ),
      }
    }

    case "AI_DELTA":
      return { ...state, streamingReply: state.streamingReply + event.text }

    case "AI_AUDIO_STARTED":
      if (!LIVE_PHASES.has(state.phase)) return state

      return {
        ...state,
        phase: "speaking",
        // Set once per turn: later frames are the reply continuing.
        firstTokenMs:
          state.firstTokenMs ??
          (state.answerEndedAtMs === null
            ? null
            : Math.max(0, event.atMs - state.answerEndedAtMs)),
      }

    case "AI_DONE":
      // The text is complete; the voice may well still be playing, so the
      // phase is left to `VOICE_DONE`. A reply with no voice at all — a tool
      // call, a cancelled turn — hands the floor straight back, or the studio
      // would wait for a voice that never comes.
      return {
        ...state,
        phase: state.phase === "processing" ? "listening" : state.phase,
        messages: commitReply(state),
        streamingReply: "",
      }

    case "VOICE_DONE":
      return state.phase === "speaking"
        ? { ...state, phase: "listening", voiceLevel: 0 }
        : state

    case "CONCLUDED":
      return state.concluded ? state : { ...state, concluded: true }

    case "PAUSED":
      return {
        ...state,
        phase: "paused",
        pausedAt: event.pausedAt,
        messages: commitReply(state),
        streamingReply: "",
        level: 0,
        voiceLevel: 0,
      }

    case "CALL_ERROR":
      return { ...state, error: event.message }

    case "CALL_ENDED":
      return {
        ...state,
        phase: "ended",
        concluded: state.concluded || event.concluded,
        messages: commitReply(state),
        streamingReply: "",
        level: 0,
        voiceLevel: 0,
      }

    case "MUTE_TOGGLED": {
      const muted = !state.muted

      return { ...state, muted, level: muted ? 0 : state.level }
    }

    case "FINISHED":
      return { ...state, phase: "completed", level: 0, voiceLevel: 0 }

    case "FINISH_FAILED":
      // Scoring failed, so the session was never closed server-side. The
      // candidate is left on the ended call, from where they can retry.
      return { ...state, error: event.message, phase: "ended" }

    default:
      return state
  }
}
