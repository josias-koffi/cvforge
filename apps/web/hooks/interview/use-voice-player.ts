"use client"

import * as React from "react"

import {
  VOICE_SAMPLE_RATE,
  decodeVoiceFrame,
  frameDurationSeconds,
} from "@/lib/interview/pcm"

/**
 * Plays the interviewer's voice as it streams in.
 *
 * Each frame is scheduled to start exactly where the previous one ends, so
 * the speech comes out continuous rather than in audible steps. Playing them
 * as they arrive is the whole point: waiting for the last frame would put the
 * entire generation back into the silence the candidate hears.
 *
 * `onIdle` fires when the last scheduled frame has finished — that, and not
 * the end of the network stream, is when the microphone may safely reopen.
 */
export function useVoicePlayer(onIdle: () => void) {
  const contextRef = React.useRef<AudioContext | null>(null)
  const playheadRef = React.useRef(0)
  const idleTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const onIdleRef = React.useRef(onIdle)

  // Written in an effect, not during render: React 19 forbids the latter.
  React.useEffect(() => {
    onIdleRef.current = onIdle
  })

  const ensureContext = React.useCallback(() => {
    if (contextRef.current) return contextRef.current
    if (typeof window === "undefined") return null

    const AudioContextCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AudioContextCtor) return null

    // Its own context at the voice's rate: resampling a shared 48 kHz context
    // for every frame is audible on speech.
    contextRef.current = new AudioContextCtor({ sampleRate: VOICE_SAMPLE_RATE })

    return contextRef.current
  }, [])

  const scheduleIdle = React.useCallback((at: number) => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)

    const context = contextRef.current
    if (!context) return

    const delay = Math.max(0, (at - context.currentTime) * 1000)
    idleTimerRef.current = setTimeout(() => {
      idleTimerRef.current = null
      onIdleRef.current()
    }, delay)
  }, [])

  /** Queues one streamed frame. */
  const push = React.useCallback(
    (base64: string) => {
      const context = ensureContext()
      if (!context) return

      // Browsers start contexts suspended until a gesture; the candidate
      // clicked to start the session, so this resolves immediately.
      void context.resume().catch(() => {})

      const samples = decodeVoiceFrame(base64)
      if (samples.length === 0) return

      const buffer = context.createBuffer(1, samples.length, VOICE_SAMPLE_RATE)
      buffer.getChannelData(0).set(samples)

      const source = context.createBufferSource()
      source.buffer = buffer
      source.connect(context.destination)

      // A small lead keeps the first frame from being clipped by scheduling.
      const startAt = Math.max(playheadRef.current, context.currentTime + 0.05)
      source.start(startAt)

      playheadRef.current = startAt + frameDurationSeconds(samples)
      scheduleIdle(playheadRef.current)
    },
    [ensureContext, scheduleIdle]
  )

  /** Nothing more is coming: if nothing is playing, the turn is already over. */
  const flush = React.useCallback(() => {
    const context = contextRef.current

    if (!context || playheadRef.current <= context.currentTime) {
      onIdleRef.current()
      return
    }

    scheduleIdle(playheadRef.current)
  }, [scheduleIdle])

  const stop = React.useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }

    playheadRef.current = 0
    void contextRef.current?.close().catch(() => {})
    contextRef.current = null
  }, [])

  // Leaving the page mid-sentence must not leave a voice talking.
  React.useEffect(() => () => stop(), [stop])

  return { flush, push, stop }
}
