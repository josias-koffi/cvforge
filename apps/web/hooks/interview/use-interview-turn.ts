"use client"

import type { Locale } from "@cvforge/types"
import * as React from "react"

import type { RecordedSegment } from "@/hooks/interview/use-audio-recorder"
import { useTts } from "@/hooks/interview/use-tts"
import {
  openResponseStream,
  triggerPrefetch,
  uploadChunk,
} from "@/lib/interview/client"
import { createSseParser } from "@/lib/interview/sse"
import type { StudioEvent } from "@/lib/interview/studio-machine"

type UseInterviewTurnOptions = {
  sessionId: string
  language: Locale
  dispatch: (event: StudioEvent) => void
}

/** Let the speakers settle before listening again. */
const ECHO_TAIL_MS = 350

function describe(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

/**
 * One turn, end to end: upload the answer, stream the reply, speak it, and
 * warm the next question.
 */
export function useInterviewTurn({
  sessionId,
  language,
  dispatch,
}: UseInterviewTurnOptions) {
  // The microphone only reopens once the voice has actually stopped, plus a
  // short tail: speakers keep ringing for a moment, and the recruiter hearing
  // itself was what made the session unusable.
  const reopenMic = React.useCallback(() => {
    setTimeout(() => dispatch({ type: "VOICE_DONE" }), ECHO_TAIL_MS)
  }, [dispatch])

  const tts = useTts(language, reopenMic)
  const sequenceRef = React.useRef(0)
  const abortRef = React.useRef<AbortController | null>(null)

  const streamReply = React.useCallback(async () => {
    const controller = new AbortController()
    abortRef.current = controller
    const startedAt = Date.now()

    try {
      const stream = await openResponseStream(sessionId, controller.signal)
      const reader = stream.getReader()
      const parser = createSseParser()

      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break

          for (const event of parser.push(value)) {
            if (event.type === "chunk" && event.text) {
              dispatch({
                elapsedMs: Date.now() - startedAt,
                text: event.text,
                type: "AI_DELTA",
              })
              tts.push(event.text)
            }

            if (event.type === "error") {
              throw new Error(event.message ?? "Le recruteur s'est interrompu.")
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      dispatch({ type: "AI_DONE" })
      // `flush` fires `reopenMic` once the queue drains — including
      // immediately when there is no voice to speak with.
      tts.flush()
      triggerPrefetch(sessionId)
    } catch (error) {
      // An abort is the component going away, not a failure to report.
      if (controller.signal.aborted) return

      tts.cancel()
      dispatch({
        message: describe(error, "Le recruteur n'a pas pu répondre."),
        type: "AI_FAILED",
      })
    } finally {
      abortRef.current = null
    }
  }, [dispatch, sessionId, tts])

  /** Uploads one recorded answer, then runs the reply. */
  const submit = React.useCallback(
    async (segment: RecordedSegment) => {
      sequenceRef.current += 1
      const sequence = sequenceRef.current

      let transcript: string
      try {
        const session = await uploadChunk(sessionId, {
          chunkBase64: segment.audioBase64,
          chunkId: `${sessionId}-${sequence}`,
          endedAt: segment.endedAt,
          format: "wav",
          isFinal: false,
          mimeType: "audio/wav",
          sequence,
          startedAt: segment.startedAt,
        })

        transcript =
          session.chunks.find(
            (chunk) => chunk.chunkId === `${sessionId}-${sequence}`
          )?.transcript ?? ""
      } catch (error) {
        dispatch({
          message: describe(error, "La transcription a échoué."),
          type: "TRANSCRIBE_FAILED",
        })
        return
      }

      dispatch({ text: transcript, type: "TRANSCRIBED" })

      // Silence: nothing was said, so there is nothing to answer.
      if (transcript.trim().length === 0) return

      await streamReply()
    },
    [dispatch, sessionId, streamReply]
  )

  /** Without this, an abandoned turn keeps generating server-side. */
  React.useEffect(
    () => () => {
      abortRef.current?.abort()
      abortRef.current = null
    },
    []
  )

  return { submit, ttsSupported: tts.supported }
}
