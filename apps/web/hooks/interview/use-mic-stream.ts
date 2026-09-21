"use client"

import * as React from "react"

import { ANALYSER_FFT_SIZE } from "@/lib/interview/analyser"

type MicStream = {
  stream: MediaStream
  context: AudioContext
  analyser: AnalyserNode
  /** Posts raw samples back while the candidate is still speaking. */
  recorder: AudioWorkletNode
}

/** Served from `public`, so the path is the URL. */
const RECORDER_WORKLET_URL = "/interview/pcm-recorder.worklet.js"

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
            // Off on purpose: automatic gain lifts the room tone into the
            // speech band during pauses, which is exactly when the detector
            // needs to hear silence. Echo cancellation stays — the recruiter
            // is playing through the speakers.
            autoGainControl: false,
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
        await context.audioWorklet.addModule(RECORDER_WORKLET_URL)

        // Unmounting can also happen while the worklet loads.
        if (cancelled) {
          for (const track of stream.getTracks()) track.stop()
          void context.close().catch(() => {})
          return
        }

        const analyser = context.createAnalyser()
        analyser.fftSize = ANALYSER_FFT_SIZE
        // The default 0.8 averages each frame with the last, adding roughly
        // 200 ms of decay after the candidate stops — silence the detector
        // would then have to wait out twice.
        analyser.smoothingTimeConstant = 0

        const recorder = new AudioWorkletNode(context, "pcm-recorder")
        // Both taps hang off the one source: the detector reads the analyser
        // while the worklet posts the same audio back for uploading.
        const source = context.createMediaStreamSource(stream)
        source.connect(analyser)
        source.connect(recorder)
        // Connected only so the graph pulls the node — an unconnected worklet
        // is not guaranteed to be rendered. It writes nothing to its output,
        // so what reaches the speakers is silence, not the candidate.
        recorder.connect(context.destination)

        micRef.current = { analyser, context, recorder, stream }
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
