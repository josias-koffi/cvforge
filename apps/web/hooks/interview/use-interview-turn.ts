"use client"

import type { InterviewTurnEvent } from "@cvforge/types"
import * as React from "react"

import type { RecordedSegment } from "@/hooks/interview/use-audio-recorder"
import { useVoicePlayer } from "@/hooks/interview/use-voice-player"
import { openTurnStream } from "@/lib/interview/client"
import { createSseParser } from "@/lib/interview/sse"
import type { StudioEvent } from "@/lib/interview/studio-machine"

type UseInterviewTurnOptions = {
  sessionId: string
  dispatch: (event: StudioEvent) => void
}

/** Let the speakers settle before listening again. */
const ECHO_TAIL_MS = 350

function describe(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

/**
 * One turn: the candidate's answer goes up, the interviewer's voice comes
 * back and plays as it arrives.
 *
 * A single request does the whole turn — the model answers the audio directly
 * rather than going through transcribe, then chat, then speak.
 */
export function useInterviewTurn({
  sessionId,
  dispatch,
}: UseInterviewTurnOptions) {
  const sequenceRef = React.useRef(0)
  const abortRef = React.useRef<AbortController | null>(null)

  // The microphone reopens only once the voice has actually stopped, plus a
  // short tail: speakers keep ringing, and the interviewer hearing itself was
  // what made the first version unusable.
  const reopenMic = React.useCallback(() => {
    setTimeout(() => dispatch({ type: "VOICE_DONE" }), ECHO_TAIL_MS)
  }, [dispatch])

  const player = useVoicePlayer(reopenMic)

  const submit = React.useCallback(
    async (segment: RecordedSegment) => {
      sequenceRef.current += 1
      const sequence = sequenceRef.current
      const controller = new AbortController()
      abortRef.current = controller
      const startedAt = Date.now()
      let spoke = false

      try {
        const stream = await openTurnStream(
          sessionId,
          {
            chunkBase64: segment.audioBase64,
            chunkId: `${sessionId}-${sequence}`,
            endedAt: segment.endedAt,
            format: "wav",
            isFinal: false,
            mimeType: "audio/wav",
            sequence,
            startedAt: segment.startedAt,
          },
          controller.signal
        )

        const reader = stream.getReader()
        const parser = createSseParser()

        try {
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break

            for (const frame of parser.push(value) as InterviewTurnEvent[]) {
              switch (frame.type) {
                case "candidate":
                  dispatch({ text: frame.text, type: "TRANSCRIBED" })
                  break

                case "audio":
                  spoke = true
                  player.push(frame.data)
                  dispatch({
                    elapsedMs: Date.now() - startedAt,
                    type: "AI_AUDIO",
                  })
                  break

                case "reply":
                  dispatch({
                    elapsedMs: Date.now() - startedAt,
                    text: frame.text,
                    type: "AI_DELTA",
                  })
                  break

                case "error":
                  throw new Error(frame.message)

                case "done":
                  break
              }
            }
          }
        } finally {
          reader.releaseLock()
        }

        dispatch({ type: "AI_DONE" })
        // Fires `reopenMic` once the last frame has finished playing — or at
        // once when the interviewer said nothing at all.
        player.flush()
      } catch (error) {
        // An abort is the component going away, not a failure to report.
        if (controller.signal.aborted) return

        if (spoke) player.stop()
        dispatch({
          message: describe(error, "Le recruteur n'a pas pu répondre."),
          type: "AI_FAILED",
        })
      } finally {
        abortRef.current = null
      }
    },
    [dispatch, player, sessionId]
  )

  /** Without this, an abandoned turn keeps generating server-side. */
  React.useEffect(
    () => () => {
      abortRef.current?.abort()
      abortRef.current = null
    },
    []
  )

  return { submit }
}
