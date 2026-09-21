"use client"

import * as React from "react"

import { VAD_FFT_SIZE } from "@/lib/interview/vad"

type MicStream = {
  stream: MediaStream
  context: AudioContext
  analyser: AnalyserNode
}

type UseMicStreamOptions = {
  onReady: () => void
  onError: (message: string) => void
}

function resolveAudioContext() {
  if (typeof window === "undefined") return null

  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext ??
    null
  )
}

/**
 * Opens the microphone once and keeps the analyser the VAD reads from.
 *
 * Everything is torn down on unmount: a live `MediaStream` keeps the browser's
 * recording indicator on long after the user has left the page.
 */
export function useMicStream({ onReady, onError }: UseMicStreamOptions) {
  const micRef = React.useRef<MicStream | null>(null)
  const callbacks = React.useRef({ onError, onReady })
  // Written in an effect, not during render: React 19 forbids the latter.
  React.useEffect(() => {
    callbacks.current = { onError, onReady }
  })

  React.useEffect(() => {
    let cancelled = false

    async function open() {
      const AudioContextCtor = resolveAudioContext()

      if (!navigator.mediaDevices?.getUserMedia || !AudioContextCtor) {
        callbacks.current.onError(
          "Ce navigateur ne permet pas d'enregistrer l'audio."
        )
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            autoGainControl: true,
            echoCancellation: true,
            noiseSuppression: true,
          },
        })

        // The component may have unmounted while the permission prompt was up.
        if (cancelled) {
          for (const track of stream.getTracks()) track.stop()
          return
        }

        const context = new AudioContextCtor()
        const analyser = context.createAnalyser()
        analyser.fftSize = VAD_FFT_SIZE
        context.createMediaStreamSource(stream).connect(analyser)

        micRef.current = { analyser, context, stream }
        callbacks.current.onReady()
      } catch {
        if (!cancelled) {
          callbacks.current.onError(
            "Micro indisponible. Autorisez l'accès puis rechargez la page."
          )
        }
      }
    }

    void open()

    return () => {
      cancelled = true
      const mic = micRef.current
      micRef.current = null

      if (!mic) return
      for (const track of mic.stream.getTracks()) track.stop()
      void mic.context.close().catch(() => {})
    }
  }, [])

  return micRef
}

export type MicStreamRef = ReturnType<typeof useMicStream>
