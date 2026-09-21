"use client"

import type { InterviewTurnEvent } from "@cvforge/types"
import * as React from "react"

import type { RecordedSegment } from "@/hooks/interview/use-audio-recorder"
import { useVoicePlayer } from "@/hooks/interview/use-voice-player"
import { openOpeningStream, openTurnStream } from "@/lib/interview/client"
import { createPlaybackStats } from "@/lib/interview/playback-stats"
import { createSseParser } from "@/lib/interview/sse"
import type { StudioEvent } from "@/lib/interview/studio-machine"

type UseInterviewTurnOptions = {
  sessionId: string
  dispatch: (event: StudioEvent) => void
}

/** Opens the stream for one exchange, given a signal that can abandon it. */
type OpenStream = (signal: AbortSignal) => Promise<ReadableStream<Uint8Array>>

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
 * rather than going through transcribe, then chat, then speak. The opening
 * greeting takes the same path with no audio to answer, so both share the
 * reading loop below.
 */
export function useInterviewTurn({
  sessionId,
  dispatch,
}: UseInterviewTurnOptions) {
  const sequenceRef = React.useRef(0)
  const abortRef = React.useRef<AbortController | null>(null)
  // A lazy initial state, not a ref: the recorder has to be readable while the
  // player is being built, and React 19 forbids touching a ref during render.
  const [stats] = React.useState(createPlaybackStats)
  // Carried from the recorder to the snapshot below: encoding happens before
  // the turn starts, so it has nowhere else to live.
  const encodeMsRef = React.useRef<number | null>(null)

  // The microphone reopens only once the voice has actually stopped, plus a
  // short tail: speakers keep ringing, and the interviewer hearing itself was
  // what made the first version unusable.
  const reopenMic = React.useCallback(() => {
    setTimeout(() => dispatch({ type: "VOICE_DONE" }), ECHO_TAIL_MS)
  }, [dispatch])

  const player = useVoicePlayer({
    onIdle: reopenMic,
    onLevel: ({ level, rms }) => dispatch({ level, rms, type: "VOICE_LEVEL" }),
    stats,
  })

  const consume = React.useCallback(
    async (openStream: OpenStream) => {
      const controller = new AbortController()
      abortRef.current = controller
      let spoke = false

      stats.reset()
      if (encodeMsRef.current !== null) stats.markEncode(encodeMsRef.current)

      try {
        // `fetch` settles on the response headers, and the controller flushes
        // them before it starts generating. What this measures is therefore
        // the answer going up and a round trip — the part of the wait the
        // server's own per-turn log cannot see.
        const requestStartedMs = Date.now()
        const stream = await openStream(controller.signal)
        stats.markUpload(Date.now() - requestStartedMs)

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

                case "audio": {
                  spoke = true
                  // The instant the frame becomes audible, not the instant it
                  // came off the network: the clock lives in the reducer,
                  // which knows when the candidate stopped talking, and what
                  // it should measure is the silence they sat through.
                  const audibleAtMs = player.push(frame.data)
                  if (audibleAtMs !== null) {
                    dispatch({ atMs: audibleAtMs, type: "AI_AUDIO" })
                  }
                  break
                }

                case "reply":
                  dispatch({
                    atMs: Date.now(),
                    text: frame.text,
                    type: "AI_DELTA",
                  })
                  break

                case "error":
                  throw new Error(frame.message)

                case "done":
                  // The interview's start is stamped server-side on the first
                  // spoken turn, so the summary the studio opened with still
                  // has it null. Without this the countdown never moves.
                  if (frame.startedAt) {
                    dispatch({
                      startedAt: frame.startedAt,
                      type: "SESSION_STARTED",
                    })
                  }
                  break
              }
            }
          }
        } finally {
          reader.releaseLock()
        }

        dispatch({ type: "AI_DONE" })
        // Every frame has been queued by now, so the snapshot is the whole
        // turn even though the last of it is still playing.
        dispatch({ stats: stats.snapshot(), type: "PLAYBACK_STATS" })
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
        // Only if it is still ours: an interrupted turn unwinds after the
        // answer that interrupted it may already have started its own.
        if (abortRef.current === controller) abortRef.current = null
      }
    },
    [dispatch, player, stats]
  )

  const submit = React.useCallback(
    async (segment: RecordedSegment) => {
      sequenceRef.current += 1
      const sequence = sequenceRef.current
      encodeMsRef.current = segment.encodeMs

      await consume((signal) =>
        openTurnStream(
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
          signal
        )
      )
    },
    [consume, sessionId]
  )

  /**
   * The candidate is talking over the interviewer: stop the voice and let go
   * of the stream.
   *
   * Dropping the request matters as much as silencing the speakers — without
   * it the server keeps generating, and billing, a reply nobody will hear.
   */
  const interrupt = React.useCallback(() => {
    player.interrupt()
    abortRef.current?.abort()
    abortRef.current = null
  }, [player])

  /** The interviewer speaks first; the candidate answers a real question. */
  const open = React.useCallback(async () => {
    dispatch({ type: "AI_OPENING" })
    await consume((signal) => openOpeningStream(sessionId, signal))
  }, [consume, dispatch, sessionId])

  /** Without this, an abandoned turn keeps generating server-side. */
  React.useEffect(
    () => () => {
      abortRef.current?.abort()
      abortRef.current = null
    },
    []
  )

  return { interrupt, open, submit }
}
