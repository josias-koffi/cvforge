"use client"

import * as React from "react"

import { initialJitterState, scheduleFrame } from "@/lib/interview/jitter"
import type { PlaybackStatsRecorder } from "@/lib/interview/playback-stats"
import {
  VOICE_SAMPLE_RATE,
  createVoiceFrameDecoder,
  frameDurationSeconds,
} from "@/lib/interview/pcm"
import { VAD_FFT_SIZE, computeLevel } from "@/lib/interview/vad"

/**
 * Plays the interviewer's voice as it streams in.
 *
 * Each frame is scheduled to start exactly where the previous one ends, so
 * the speech comes out continuous rather than in audible steps. Playing them
 * as they arrive is the whole point: waiting for the last frame would put the
 * entire generation back into the silence the candidate hears.
 *
 * Two things keep it continuous, and both live in their own module: `pcm`
 * carries the half sample a frame can end on, and `jitter` decides how far
 * ahead of the speakers to queue. The hook only owns the audio nodes.
 *
 * `onIdle` fires when the last scheduled frame has finished — that, and not
 * the end of the network stream, is when the microphone may safely reopen.
 *
 * `onLevel` reports the amplitude of what is actually coming out of the
 * speakers, so the orb can breathe with the interviewer's voice instead of
 * sitting frozen on a spinner while it talks.
 */
export function useVoicePlayer({
  onIdle,
  onLevel,
  stats,
}: {
  onIdle: () => void
  onLevel: (level: number) => void
  /** Records what the candidate heard, gaps included. */
  stats: PlaybackStatsRecorder
}) {
  const contextRef = React.useRef<AudioContext | null>(null)
  const analyserRef = React.useRef<AnalyserNode | null>(null)
  const decoderRef = React.useRef(createVoiceFrameDecoder())
  const jitterRef = React.useRef(initialJitterState)
  const idleTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const frameIdRef = React.useRef(0)
  const onIdleRef = React.useRef(onIdle)
  const onLevelRef = React.useRef(onLevel)

  // Written in an effect, not during render: React 19 forbids the latter.
  React.useEffect(() => {
    onIdleRef.current = onIdle
    onLevelRef.current = onLevel
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
    const context = new AudioContextCtor({ sampleRate: VOICE_SAMPLE_RATE })

    // One analyser for the whole turn, between every frame and the speakers:
    // the meter then reads what the candidate hears, gaps included, rather
    // than what the network happened to deliver.
    const analyser = context.createAnalyser()
    analyser.fftSize = VAD_FFT_SIZE
    analyser.smoothingTimeConstant = 0
    analyser.connect(context.destination)

    contextRef.current = context
    analyserRef.current = analyser

    return context
  }, [])

  /** Reads the output while it plays; stopped by `stopMeter` at idle. */
  const startMeter = React.useCallback(() => {
    if (frameIdRef.current) return

    let frame = new Uint8Array(0)

    const tick = () => {
      frameIdRef.current = requestAnimationFrame(tick)

      const analyser = analyserRef.current
      if (!analyser) return

      if (frame.length !== analyser.fftSize) {
        frame = new Uint8Array(analyser.fftSize)
      }
      analyser.getByteTimeDomainData(frame)
      onLevelRef.current(computeLevel(frame))
    }

    frameIdRef.current = requestAnimationFrame(tick)
  }, [])

  const stopMeter = React.useCallback(() => {
    if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current)

    frameIdRef.current = 0
    onLevelRef.current(0)
  }, [])

  const scheduleIdle = React.useCallback((at: number) => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)

    const context = contextRef.current
    if (!context) return

    const delay = Math.max(0, (at - context.currentTime) * 1000)
    idleTimerRef.current = setTimeout(() => {
      idleTimerRef.current = null
      stopMeter()
      onIdleRef.current()
    }, delay)
  }, [stopMeter])

  /**
   * Queues one streamed frame, and reports when it will actually be audible.
   *
   * That instant, not the moment the frame came off the network, is the one
   * the candidate experiences — which is what the latency readout should show.
   * Null when there was nothing to play.
   */
  const push = React.useCallback(
    (base64: string): number | null => {
      const context = ensureContext()
      if (!context) return null

      // Browsers start contexts suspended until a gesture; the candidate
      // clicked to start the session, so this resolves immediately.
      void context.resume().catch(() => {})

      const samples = decoderRef.current.push(base64)
      // A frame can complete no whole sample at all — it was a fragment, and
      // the decoder is holding it until the rest arrives.
      if (samples.length === 0) return null

      const buffer = context.createBuffer(1, samples.length, VOICE_SAMPLE_RATE)
      buffer.getChannelData(0).set(samples)

      const source = context.createBufferSource()
      source.buffer = buffer
      source.connect(analyserRef.current ?? context.destination)

      const scheduled = scheduleFrame(jitterRef.current, {
        durationSeconds: frameDurationSeconds(samples),
        now: context.currentTime,
      })
      source.start(scheduled.startAt)
      jitterRef.current = scheduled.next

      const carried = decoderRef.current.pending()
      stats.record({
        leadMs: scheduled.leadMs,
        misaligned: carried.chars > 0 || carried.bytes > 0,
        underrun: scheduled.underrun,
      })

      startMeter()
      scheduleIdle(jitterRef.current.playhead)

      return Date.now() + scheduled.leadMs
    },
    [ensureContext, scheduleIdle, startMeter, stats]
  )

  /** Nothing more is coming: if nothing is playing, the turn is already over. */
  const flush = React.useCallback(() => {
    const context = contextRef.current

    if (!context || jitterRef.current.playhead <= context.currentTime) {
      stopMeter()
      onIdleRef.current()
      return
    }

    scheduleIdle(jitterRef.current.playhead)
  }, [scheduleIdle, stopMeter])

  const stop = React.useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }

    stopMeter()
    // The margin starts over with the next reply: it was widened for a network
    // that stuttered a minute ago, not for this one.
    jitterRef.current = initialJitterState
    // Otherwise the half sample left over from an abandoned reply shifts the
    // start of the next one by a byte, and it comes out as static.
    decoderRef.current.reset()
    void contextRef.current?.close().catch(() => {})
    contextRef.current = null
    analyserRef.current = null
  }, [stopMeter])

  // Leaving the page mid-sentence must not leave a voice talking.
  React.useEffect(() => () => stop(), [stop])

  return { flush, push, stop }
}
