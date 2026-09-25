"use client"

import * as React from "react"

import { ANALYSER_FFT_SIZE, computeLevel } from "@/lib/interview/analyser"
import { readAudioQuality, type AudioQuality } from "@/lib/interview/audio-quality"
import {
  fetchSession,
  openRealtimeCall,
  pauseSession,
} from "@/lib/interview/client"
import { toStudioEvents } from "@/lib/interview/realtime-events"
import type { StudioEvent } from "@/lib/interview/studio-machine"

type UseRealtimeCallOptions = {
  sessionId: string
  dispatch: (event: StudioEvent) => void
  muted: boolean
}

type Call = {
  peer: RTCPeerConnection
  stream: MediaStream
  audio: HTMLAudioElement
  context: AudioContext | null
  frame: number | null
  stats: number | null
  quality: AudioQuality | null
}

/** The levels drive the orb; thirty reads a second is all it can show. */
export const LEVEL_INTERVAL_MS = 33

/**
 * A level change smaller than this is not worth a render. Every dispatch
 * re-renders the studio and its WebGL orb, and a page busy thirty times a
 * second is one more reason for the voice to stutter.
 */
const LEVEL_STEP = 0.03

/**
 * How much audio the browser holds before playing the recruiter's voice.
 * Chrome's adaptive default runs close to the bone and invents audio — the
 * "rusty floppy disk" sound — at the first late packet; 120 ms absorbs
 * ordinary Wi-Fi jitter for a delay nobody hears in a conversation.
 */
const JITTER_BUFFER_TARGET_MS = 120

const STATS_INTERVAL_MS = 5_000

/**
 * When the server hangs up, the connection reads `disconnected` long before
 * it reads `failed`. A blip on the network reads the same way and recovers
 * within a second or two; past this, the call is taken as over.
 */
const DISCONNECTED_GRACE_MS = 3_000

function describe(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

/** Whether the ended call was the recruiter's goodbye rather than a drop. */
async function readConcluded(sessionId: string) {
  try {
    return (await fetchSession(sessionId)).concluded === true
  } catch {
    return false
  }
}

/**
 * The live interview call, over WebRTC straight to OpenAI (ADR-026).
 *
 * The microphone goes up as a media track and the recruiter's voice comes
 * back as one; turn detection, interruption and playback are the call's own.
 * What is left here is the handshake — through our API, which holds the key
 * and the brief — and turning the data channel's events into studio events.
 */
export function useRealtimeCall({
  sessionId,
  dispatch,
  muted,
}: UseRealtimeCallOptions) {
  const callRef = React.useRef<Call | null>(null)
  /**
   * Bumped by every connect and every hangup. A connection attempt checks it
   * after each await and gives up quietly once it is no longer the current
   * one: React mounts the studio twice in development, and the first attempt
   * was still waiting on the API when its peer connection was closed.
   */
  const attemptRef = React.useRef(0)
  // Read when the call opens, which must not reopen it on every toggle.
  const mutedRef = React.useRef(muted)

  const release = React.useCallback((call: Call) => {
    if (callRef.current === call) callRef.current = null

    if (call.frame !== null) clearInterval(call.frame)
    if (call.stats !== null) clearInterval(call.stats)
    // For whoever hears the voice crackle: the network, or the call itself.
    if (call.quality) console.info("[interview] audio", call.quality)
    call.peer.close()
    for (const track of call.stream.getTracks()) track.stop()
    call.audio.srcObject = null
    void call.context?.close()
  }, [])

  /** Ends the call from this side: on unmount, and before scoring. */
  const hangup = React.useCallback(() => {
    attemptRef.current += 1
    const call = callRef.current
    if (call) release(call)
  }, [release])

  const connect = React.useCallback(async () => {
    hangup()
    const attempt = attemptRef.current
    const current = () => attemptRef.current === attempt

    dispatch({ type: "CONNECTING" })

    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
      dispatch({
        message: "Ce navigateur ne permet pas de passer un appel audio.",
        type: "MIC_FAILED",
      })
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { autoGainControl: true, echoCancellation: true, noiseSuppression: true },
      })
    } catch {
      if (current()) {
        dispatch({
          message: "Autorisez le micro pour passer l'entretien.",
          type: "MIC_FAILED",
        })
      }
      return
    }

    if (!current()) {
      for (const track of stream.getTracks()) track.stop()
      return
    }

    const peer = new RTCPeerConnection()
    const audio = new Audio()
    audio.autoplay = true
    const call: Call = {
      audio,
      context: null,
      frame: null,
      peer,
      quality: null,
      stats: null,
      stream,
    }
    callRef.current = call

    // The far side hung up, or the network did: only a live, current call
    // reports it, never one this side already let go of.
    const ended = async () => {
      if (!current() || callRef.current !== call) return

      release(call)
      const concluded = await readConcluded(sessionId)
      if (current()) dispatch({ concluded, type: "CALL_ENDED" })
    }

    const [track] = stream.getAudioTracks()
    if (track) {
      track.enabled = !mutedRef.current
      peer.addTrack(track, stream)
    }

    const mic = watchMicrophone(stream)
    call.context = mic?.context ?? null
    let voice: RTCRtpReceiver | null = null
    peer.ontrack = (event) => {
      const receiver = event.receiver as RTCRtpReceiver & {
        jitterBufferTarget?: number | null
      }
      if ("jitterBufferTarget" in receiver) {
        receiver.jitterBufferTarget = JITTER_BUFFER_TARGET_MS
      }
      voice = receiver
      audio.srcObject = event.streams[0] ?? new MediaStream([event.track])
    }
    let last = { level: 0, voiceLevel: 0 }
    call.frame = window.setInterval(() => {
      const level = mic?.read() ?? 0
      const voiceLevel = voice ? readVoiceLevel(voice) : 0
      if (Math.abs(level - last.level) >= LEVEL_STEP) {
        last = { ...last, level }
        dispatch({ level, type: "LEVEL" })
      }
      if (Math.abs(voiceLevel - last.voiceLevel) >= LEVEL_STEP) {
        last = { ...last, voiceLevel }
        dispatch({ level: voiceLevel, type: "VOICE_LEVEL" })
      }
    }, LEVEL_INTERVAL_MS)
    call.stats = window.setInterval(() => {
      void peer
        .getStats()
        .then((report) => {
          call.quality =
            readAudioQuality(report.values() as Iterable<never>) ?? call.quality
        })
        .catch(() => undefined)
    }, STATS_INTERVAL_MS)

    const channel = peer.createDataChannel("oai-events")
    channel.onmessage = (message) => {
      let payload: unknown
      try {
        payload = JSON.parse(String(message.data))
      } catch {
        return
      }
      for (const event of toStudioEvents(payload)) dispatch(event)
    }
    channel.onclose = () => void ended()
    let disconnectedTimer: number | null = null
    peer.onconnectionstatechange = () => {
      if (disconnectedTimer !== null) {
        clearTimeout(disconnectedTimer)
        disconnectedTimer = null
      }
      if (peer.connectionState === "failed" || peer.connectionState === "closed") {
        void ended()
      } else if (peer.connectionState === "disconnected") {
        disconnectedTimer = window.setTimeout(() => {
          if (peer.connectionState === "disconnected") void ended()
        }, DISCONNECTED_GRACE_MS)
      }
    }

    try {
      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      const answer = await openRealtimeCall(sessionId, offer.sdp ?? "")
      if (!current()) return

      await peer.setRemoteDescription({ sdp: answer.sdp, type: "answer" })
      dispatch({ startedAt: answer.startedAt, type: "CONNECTED" })
    } catch (error) {
      if (!current()) return

      release(call)
      dispatch({
        message: describe(error, "Impossible de joindre le recruteur."),
        type: "CONNECT_FAILED",
      })
    }
  }, [dispatch, hangup, release, sessionId])

  /**
   * Pauses the interview: hung up here at once, so the recruiter stops mid-
   * word if it has to, then the server stops the clock.
   */
  const pause = React.useCallback(async () => {
    hangup()
    try {
      const { pausedAt } = await pauseSession(sessionId)
      dispatch({ pausedAt: pausedAt ?? new Date().toISOString(), type: "PAUSED" })
    } catch (error) {
      dispatch({ pausedAt: new Date().toISOString(), type: "PAUSED" })
      dispatch({
        message: describe(error, "Impossible de mettre l'entretien en pause."),
        type: "CALL_ERROR",
      })
    }
  }, [dispatch, hangup, sessionId])

  // Muting stops what goes up, not the call: the recruiter keeps its turn.
  React.useEffect(() => {
    mutedRef.current = muted
    const track = callRef.current?.stream.getAudioTracks()[0]
    if (track) track.enabled = !muted
  }, [muted])

  // A live microphone keeps the browser's recording indicator on long after
  // the page is gone, and an open call keeps billing.
  React.useEffect(() => hangup, [hangup])

  return { connect, hangup, pause }
}

/**
 * The recruiter's voice level, 0-1, as the browser is playing it.
 *
 * Read off the receiver rather than through Web Audio: a second consumer on
 * the incoming stream is one more thing that can make the voice stutter, and
 * it only ever moved once the page's audio context was allowed to start.
 * `audioLevel` is linear, 1 being full scale, so speech sits around 0.1-0.5 —
 * the same range the microphone's peak meter reads.
 */
function readVoiceLevel(receiver: RTCRtpReceiver) {
  const [source] = receiver.getSynchronizationSources?.() ?? []
  // A level from a packet that stopped arriving is the last word, not a voice.
  // Its timestamp is wall-clock time, on the page's own clock.
  const now = performance.timeOrigin + performance.now()
  if (!source || now - source.timestamp > 250) return 0

  return Math.round(Math.min(1, (source.audioLevel ?? 0) * 2) * 100) / 100
}

/**
 * The candidate's microphone level, for the orb. Null where Web Audio is
 * missing: the call works without the meter.
 *
 * The call is opened on page load, not on a click, and an audio context made
 * then starts suspended — a meter reading silence forever. It is started
 * again at the candidate's first click or key, whatever it is.
 */
function watchMicrophone(stream: MediaStream) {
  const AudioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!AudioContextCtor) return null

  const context = new AudioContextCtor()
  const wake = () => {
    if (context.state === "suspended") void context.resume().catch(() => undefined)
  }
  wake()
  const gestures = ["pointerdown", "keydown"] as const
  for (const gesture of gestures) window.addEventListener(gesture, wake)
  context.addEventListener("statechange", () => {
    if (context.state === "closed") {
      for (const gesture of gestures) window.removeEventListener(gesture, wake)
    }
  })

  const analyser = context.createAnalyser()
  analyser.fftSize = ANALYSER_FFT_SIZE
  context.createMediaStreamSource(stream).connect(analyser)
  const frame = new Uint8Array(ANALYSER_FFT_SIZE)

  return {
    context,
    read: () => {
      analyser.getByteTimeDomainData(frame)
      return computeLevel(frame)
    },
  }
}
