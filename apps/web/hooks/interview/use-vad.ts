"use client"

import * as React from "react"

import type { MicStreamRef } from "@/hooks/interview/use-mic-stream"
import { nextVadDecision, type VadStatus } from "@/lib/interview/vad"

type UseVadOptions = {
  micRef: MicStreamRef
  /** Paused while the studio is busy — see the reducer for which phases. */
  active: boolean
  muted: boolean
  status: VadStatus
  onLevel: (level: number) => void
  onSpeechStart: () => void
  onSpeechEnd: () => void
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
}: UseVadOptions) {
  const inputs = React.useRef({
    active,
    muted,
    onLevel,
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
      onSpeechEnd,
      onSpeechStart,
      status,
    }
  })

  React.useEffect(() => {
    let frameId = 0
    let silenceFrames = 0

    function tick() {
      frameId = requestAnimationFrame(tick)

      const analyser = micRef.current?.analyser
      const current = inputs.current
      if (!analyser || !current.active) return

      const frame = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(frame)

      const decision = nextVadDecision({
        frame,
        muted: current.muted,
        silenceFrames,
        status: current.status,
      })

      silenceFrames = decision.silenceFrames
      current.onLevel(current.muted ? 0 : computeLevel(frame))

      if (decision.action === "start") current.onSpeechStart()
      if (decision.action === "stop") current.onSpeechEnd()
    }

    frameId = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frameId)
  }, [micRef])
}

/** Peak rather than RMS: it tracks the voice more legibly on a meter. */
function computeLevel(frame: Uint8Array) {
  let peak = 0
  for (let index = 0; index < frame.length; index += 1) {
    peak = Math.max(peak, frame[index] ?? 0)
  }

  return Math.round((peak / 255) * 100) / 100
}
