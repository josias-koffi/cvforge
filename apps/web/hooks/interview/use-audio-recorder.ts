"use client"

import * as React from "react"

import type { MicStreamRef } from "@/hooks/interview/use-mic-stream"
import { encodeSegment } from "@/lib/interview/wav"

export type RecordedSegment = {
  audioBase64: string
  startedAt: string
  endedAt: string
}

type UseAudioRecorderOptions = {
  micRef: MicStreamRef
  onSegment: (segment: RecordedSegment) => void
  onError: (message: string) => void
}

function resolveMediaRecorder() {
  return typeof window !== "undefined" && "MediaRecorder" in window
    ? window.MediaRecorder
    : null
}

/** The first container this browser will actually give us. */
function preferredMimeType(Recorder: typeof MediaRecorder) {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ]

  return candidates.find((type) => Recorder.isTypeSupported?.(type))
}

/**
 * Records one answer and hands it over as 16 kHz mono WAV.
 *
 * The browser records in whatever container it prefers; the blob is decoded
 * and re-encoded here so the API always receives the same format, whatever
 * the browser. That conversion is also what keeps the upload small.
 */
export function useAudioRecorder({
  micRef,
  onSegment,
  onError,
}: UseAudioRecorderOptions) {
  const recorderRef = React.useRef<MediaRecorder | null>(null)
  const chunksRef = React.useRef<Blob[]>([])
  const startedAtRef = React.useRef<string>("")
  const callbacks = React.useRef({ onError, onSegment })
  // Written in an effect, not during render: React 19 forbids the latter.
  React.useEffect(() => {
    callbacks.current = { onError, onSegment }
  })

  const encode = React.useCallback(
    async (blobs: Blob[]) => {
      const context = micRef.current?.context
      if (blobs.length === 0 || !context) return

      try {
        const buffer = await context.decodeAudioData(
          await new Blob(blobs, { type: blobs[0]?.type }).arrayBuffer()
        )

        callbacks.current.onSegment({
          audioBase64: encodeSegment(buffer.getChannelData(0), buffer.sampleRate),
          endedAt: new Date().toISOString(),
          startedAt: startedAtRef.current,
        })
      } catch {
        callbacks.current.onError("Impossible de lire l'enregistrement.")
      }
    },
    [micRef]
  )

  const start = React.useCallback(() => {
    const Recorder = resolveMediaRecorder()
    const stream = micRef.current?.stream

    if (!Recorder || !stream || recorderRef.current) return

    const mimeType = preferredMimeType(Recorder)
    const recorder = new Recorder(stream, mimeType ? { mimeType } : undefined)

    chunksRef.current = []
    startedAtRef.current = new Date().toISOString()

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }

    recorder.onstop = () => {
      const blobs = chunksRef.current
      chunksRef.current = []
      recorderRef.current = null

      void encode(blobs)
    }

    recorderRef.current = recorder
    recorder.start()
  }, [encode, micRef])

  const stop = React.useCallback(() => {
    const recorder = recorderRef.current
    if (recorder?.state === "recording") recorder.stop()
  }, [])

  /**
   * Ends the recording and throws it away.
   *
   * Muting mid-sentence used to leave the recorder running with `recorderRef`
   * still set, which made every later `start()` a silent no-op — one mute and
   * the microphone was dead for the rest of the session. The VAD uses this too
   * when a burst turns out to have been a cough.
   */
  const cancel = React.useCallback(() => {
    const recorder = recorderRef.current
    recorderRef.current = null
    chunksRef.current = []

    if (recorder?.state === "recording") {
      recorder.onstop = null
      recorder.stop()
    }
  }, [])

  React.useEffect(
    () => () => {
      const recorder = recorderRef.current
      recorderRef.current = null
      // Dropped rather than encoded: the component is going away.
      if (recorder?.state === "recording") {
        recorder.onstop = null
        recorder.stop()
      }
    },
    []
  )

  return { cancel, start, stop }
}
