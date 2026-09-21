"use client"

import * as React from "react"

import type { MicStreamRef } from "@/hooks/interview/use-mic-stream"
import { chunkSampleCount, createCaptureBatcher } from "@/lib/interview/capture"
import {
  bytesToBase64,
  encodePcm16,
  resampleMonoPcm,
  resolveTargetRate,
  toBase64,
  wrapPcm16InWav,
} from "@/lib/interview/wav"

export type RecordedSegment = {
  audioBase64: string
  startedAt: string
  endedAt: string
  /**
   * What was still left to do once the candidate stopped talking.
   *
   * Part of the silence they sit through, and invisible to the server's own
   * per-turn log, which only starts counting once the request reaches it.
   */
  encodeMs: number
}

type UseAudioRecorderOptions = {
  micRef: MicStreamRef
  /** The microphone opens asynchronously; nothing can be bound before it has. */
  ready: boolean
  /** One piece of the answer, ready to go up while it is still being spoken. */
  onPart: (audioBase64: string) => void
  onSegment: (segment: RecordedSegment) => void
  onError: (message: string) => void
}

function concat(parts: Uint8Array[], length: number) {
  const joined = new Uint8Array(length)
  let offset = 0

  for (const part of parts) {
    joined.set(part, offset)
    offset += part.length
  }

  return joined
}

/**
 * Records one answer and hands it over as 16 kHz mono WAV.
 *
 * Encoded as it is spoken, rather than afterwards. The previous version ran
 * `MediaRecorder`, waited for `onstop`, then decoded the WebM, resampled it
 * and base64-ed the lot — all of it after the candidate's last word, inside
 * the silence before the recruiter answers. Raw samples arrive from the
 * worklet instead and each chunk is downsampled and encoded on the spot, so
 * what is left at the end is a header and one base64 pass.
 */
export function useAudioRecorder({
  micRef,
  ready,
  onPart,
  onSegment,
  onError,
}: UseAudioRecorderOptions) {
  const recordingRef = React.useRef(false)
  const batcherRef = React.useRef<ReturnType<
    typeof createCaptureBatcher
  > | null>(null)
  const partsRef = React.useRef<Uint8Array[]>([])
  const byteLengthRef = React.useRef(0)
  const startedAtRef = React.useRef<string>("")
  const callbacks = React.useRef({ onError, onPart, onSegment })
  // Written in an effect, not during render: React 19 forbids the latter.
  React.useEffect(() => {
    callbacks.current = { onError, onPart, onSegment }
  })

  /**
   * Downsamples one chunk, sends it, and keeps it.
   *
   * Kept as well as sent on purpose: if any piece fails to reach the server
   * the whole answer still exists here, and the turn falls back to carrying
   * it. Streaming is then an optimisation rather than a way to lose an
   * answer, and it costs the memory the old recorder spent anyway.
   */
  const encodeChunk = React.useCallback(
    (chunk: Float32Array, sampleRate: number) => {
      const { pcm } = resampleMonoPcm(chunk, sampleRate)
      const bytes = encodePcm16(pcm)

      partsRef.current.push(bytes)
      byteLengthRef.current += bytes.length
      callbacks.current.onPart(bytesToBase64(bytes))
    },
    []
  )

  // Bound once, for the life of the microphone: the worklet posts whether or
  // not an answer is being recorded, and `recordingRef` decides what to keep.
  React.useEffect(() => {
    const mic = ready ? micRef.current : null
    if (!mic) return

    const { recorder } = mic
    const { sampleRate } = mic.context

    // A listener rather than `onmessage`: assigning a property on something
    // reached through a ref is exactly what the compiler will not allow, and
    // `start()` is needed either way once a listener is used.
    const receive = (event: MessageEvent<ArrayBuffer>) => {
      if (!recordingRef.current) return

      const batcher = batcherRef.current
      if (!batcher) return

      for (const chunk of batcher.push(new Float32Array(event.data))) {
        encodeChunk(chunk, sampleRate)
      }
    }

    recorder.port.addEventListener("message", receive)
    recorder.port.start()

    return () => recorder.port.removeEventListener("message", receive)
  }, [encodeChunk, micRef, ready])

  const start = React.useCallback(() => {
    const sampleRate = micRef.current?.context.sampleRate
    if (!sampleRate || recordingRef.current) return

    batcherRef.current = createCaptureBatcher(chunkSampleCount(sampleRate))
    partsRef.current = []
    byteLengthRef.current = 0
    startedAtRef.current = new Date().toISOString()
    recordingRef.current = true
  }, [micRef])

  const stop = React.useCallback(() => {
    const sampleRate = micRef.current?.context.sampleRate
    if (!recordingRef.current || !sampleRate) return

    recordingRef.current = false

    const startedMs = Date.now()
    const tail = batcherRef.current?.drain()
    if (tail) encodeChunk(tail, sampleRate)

    const parts = partsRef.current
    const byteLength = byteLengthRef.current
    partsRef.current = []
    byteLengthRef.current = 0
    batcherRef.current = null

    if (byteLength === 0) {
      callbacks.current.onError("Impossible de lire l'enregistrement.")
      return
    }

    callbacks.current.onSegment({
      audioBase64: toBase64(
        wrapPcm16InWav(concat(parts, byteLength), resolveTargetRate(sampleRate))
      ),
      encodeMs: Date.now() - startedMs,
      endedAt: new Date().toISOString(),
      startedAt: startedAtRef.current,
    })
  }, [encodeChunk, micRef])

  /**
   * Ends the recording and throws it away.
   *
   * Muting mid-sentence used to leave the recorder running, which made every
   * later `start()` a silent no-op — one mute and the microphone was dead for
   * the rest of the session. The VAD uses this too when a burst turns out to
   * have been a cough.
   */
  const cancel = React.useCallback(() => {
    recordingRef.current = false
    batcherRef.current = null
    partsRef.current = []
    byteLengthRef.current = 0
  }, [])

  // Leaving the page must not keep an answer buffered.
  React.useEffect(() => () => cancel(), [cancel])

  return { cancel, start, stop }
}
