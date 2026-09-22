"use client"

import * as React from "react"

import type { MicStreamRef } from "@/hooks/interview/use-mic-stream"
import { computeLevel } from "@/lib/interview/analyser"
import {
  VAD_INTERVAL_MS,
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
  /** Loudness of the interviewer's own voice, on the microphone's scale. */
  voiceRms: number
  onLevel: (level: number) => void
  onSpeechStart: () => void
  onSpeechEnd: () => void
  /** The noise that opened the microphone was not an answer: drop it. */
  onSpeechAbort: () => void
  /** The candidate talked over the interviewer: cut it off and record them. */
  onBargeIn: () => void
}

/**
 * Drives voice detection off the analyser, on a timer.
 *
 * The decision itself lives in `lib/interview/vad`; this only reads frames and
 * dispatches. The loop is started once and reads its inputs from a ref, so a
 * state change never restarts it — rebinding the loop on every level update
 * would drop samples and stutter the meter.
 *
 * Deliberately not `requestAnimationFrame`. rAF is paced by whatever the page
 * is painting, and the studio paints a shader-driven sphere: when that pulled
 * the frame rate down, the detector sampled a few milliseconds of audio every
 * fifth of a second and heard nothing but the gaps between syllables. What
 * the microphone hears cannot depend on what the GPU is doing.
 */
export function useVad({
  micRef,
  active,
  muted,
  status,
  voiceRms,
  onLevel,
  onSpeechStart,
  onSpeechEnd,
  onSpeechAbort,
  onBargeIn,
}: UseVadOptions) {
  const inputs = React.useRef({
    active,
    muted,
    onBargeIn,
    onLevel,
    onSpeechAbort,
    onSpeechEnd,
    onSpeechStart,
    status,
    voiceRms,
  })
  // Written in an effect, not during render: React 19 forbids the latter.
  React.useEffect(() => {
    inputs.current = {
      active,
      muted,
      onBargeIn,
      onLevel,
      onSpeechAbort,
      onSpeechEnd,
      onSpeechStart,
      status,
      voiceRms,
    }
  })

  React.useEffect(() => {
    let accumulator = initialVadAccumulator
    let previousMs: number | null = null
    // Hoisted: allocating one per tick is forty allocations a second.
    let frame = new Uint8Array(0)

    function tick() {
      const nowMs = performance.now()
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
        voiceRms: current.voiceRms,
      })

      accumulator = {
        grantedMs: decision.grantedMs,
        noiseFloor: decision.noiseFloor,
        silenceMs: decision.silenceMs,
        speechMs: decision.speechMs,
      }
      current.onLevel(current.muted ? 0 : computeLevel(frame))

      if (decision.action === "start") current.onSpeechStart()
      if (decision.action === "stop") current.onSpeechEnd()
      if (decision.action === "abort") current.onSpeechAbort()
      if (decision.action === "barge-in") current.onBargeIn()
    }

    const timer = setInterval(tick, VAD_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [micRef])
}
