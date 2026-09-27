import type { StudioEvent } from "@/lib/interview/studio-machine"

/** The recruiter's tool for saying the interview is over (see the API). */
export const END_INTERVIEW_TOOL = "end_interview"

/**
 * One event off the call's data channel, as the studio understands it.
 *
 * The Realtime API sends several dozen event types; the studio needs a
 * handful. Everything else — session updates, rate limits, the server's own
 * bookkeeping — maps to nothing. Kept apart from the hook so it can be tested
 * without a peer connection.
 */
export function toStudioEvents(
  raw: unknown,
  now: () => number = Date.now
): StudioEvent[] {
  if (!raw || typeof raw !== "object") return []
  const event = raw as Record<string, unknown>

  switch (event.type) {
    case "input_audio_buffer.speech_started":
      return [{ type: "USER_SPEECH_START" }]

    case "input_audio_buffer.speech_stopped":
      return typeof event.item_id === "string"
        ? [{ atMs: now(), itemId: event.item_id, type: "USER_SPEECH_END" }]
        : []

    case "conversation.item.input_audio_transcription.completed":
      return typeof event.item_id === "string"
        ? [
            {
              itemId: event.item_id,
              text: typeof event.transcript === "string" ? event.transcript : "",
              type: "TRANSCRIBED",
            },
          ]
        : []

    case "conversation.item.input_audio_transcription.failed":
      return typeof event.item_id === "string"
        ? [{ itemId: event.item_id, text: "", type: "TRANSCRIBED" }]
        : []

    case "response.output_audio_transcript.delta":
      return typeof event.delta === "string" && event.delta.length > 0
        ? [{ text: event.delta, type: "AI_DELTA" }]
        : []

    // WebRTC only: the voice actually started and stopped coming out of the
    // speakers, which is what the candidate perceives — not generation.
    case "output_audio_buffer.started":
      return [{ atMs: now(), type: "AI_AUDIO_STARTED" }]

    case "output_audio_buffer.stopped":
    case "output_audio_buffer.cleared":
      return [{ type: "VOICE_DONE" }]

    case "response.done": {
      const output = (event.response as { output?: unknown } | undefined)?.output
      const concluded =
        Array.isArray(output) &&
        output.some(
          (item: { type?: unknown; name?: unknown }) =>
            item?.type === "function_call" && item.name === END_INTERVIEW_TOOL
        )

      return concluded ? [{ type: "CONCLUDED" }, { type: "AI_DONE" }] : [{ type: "AI_DONE" }]
    }

    case "error": {
      const detail = event.error as { code?: unknown; message?: unknown } | undefined
      // Cancelling a reply that had just finished is a race, not a failure.
      if (detail?.code === "response_cancel_not_active") return []
      const message =
        typeof detail?.message === "string" ? detail.message : "Erreur inconnue."

      return [{ message: `Le recruteur a rencontré un problème : ${message}`, type: "CALL_ERROR" }]
    }

    default:
      return []
  }
}
