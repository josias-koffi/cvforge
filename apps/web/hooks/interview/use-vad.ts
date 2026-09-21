"use client"

import * as React from "react"

import type { MicStreamRef } from "@/hooks/interview/use-mic-stream"
import {
  initialVadAccumulator,
  nextVadDecision,
  type VadStatus,
} from "@/lib/interview/vad"

type UseVadOptions = {
  micRef: MicStreamRef
  /** Paused while the studio is busy — see the reducer for which phases. */
  active: boolean
  muted: boolean
  status: VadStatus
  onLevel: (level: number) => void
  onSpeechStart: () => void
  onSpeechEnd: () => void
  /** The noise that opened the microphone was not an answer: drop it. */
  onSpeechAbort: () => void
}

/**
 * Drives voice detection off the analyser, one animation frame at a time.
 *
 * The decision itself lives in `lib/interview/vad`; this only reads frames and
 * dispatches. The loop is started once and reads its inputs from a ref, so a
 * state change never restarts it — rebinding `requestAnimationFrame` on every
 * level update would drop frames and stutter the meter.
 */
export function useVad({
  micRef,
  active,
  muted,
  status,
  onLevel,
  onSpeechStart,
  onSpeechEnd,
  onSpeechAbort,
}: UseVadOptions) {
  const inputs = React.useRef({
    active,
    muted,
    onLevel,
    onSpeechAbort,
    onSpeechEnd,
    onSpeechStart,
    status,
  })
  // Written in an effect, not during render: React 19 forbids the latter.
  React.useEffect(() => {
    inputs.current = {
      active,
      muted,
      onLevel,
      onSpeechAbort,
      onSpeechEnd,
      onSpeechStart,
      status,
    }
  })

  React.useEffect(() => {
    let frameId = 0
    let accumulator = initialVadAccumulator
    let previousMs: number | null = null
    // Hoisted: allocating one per frame is sixty allocations a second.
    let frame = new Uint8Array(0)

    function tick(nowMs: number) {
      frameId = requestAnimationFrame(tick)

      const analyser = micRef.current?.analyser
      const current = inputs.current

      if (!analyser || !current.active) {
        // A count left over from the last turn would end the next answer
        // early, so the run is abandoned rather than paused.
        accumulator = initialVadAccumulator
        previousMs = null
        return
      }

      if (frame.length !== analyser.fftSize) frame = new Uint8Array(analyser.fftSize)
      analyser.getByteTimeDomainData(frame)

      const deltaMs = previousMs === null ? 0 : nowMs - previousMs
      previousMs = nowMs

      const decision = nextVadDecision({
        ...accumulator,
        deltaMs,
        frame,
        muted: current.muted,
        status: current.status,
      })

      accumulator = {
        noiseFloor: decision.noiseFloor,
        silenceMs: decision.silenceMs,
        speechMs: decision.speechMs,
      }
      current.onLevel(current.muted ? 0 : computeLevel(frame))

      if (decision.action === "start") current.onSpeechStart()
      if (decision.action === "stop") current.onSpeechEnd()
      if (decision.action === "abort") current.onSpeechAbort()
    }

    frameId = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frameId)
  }, [micRef])
}

/** Peak deviation from the centre line: it tracks the voice legibly on a meter. */
function computeLevel(frame: Uint8Array) {
  let peak = 0
  for (let index = 0; index < frame.length; index += 1) {
    peak = Math.max(peak, Math.abs((frame[index] ?? 128) - 128))
  }

  return Math.round((peak / 128) * 100) / 100
}
