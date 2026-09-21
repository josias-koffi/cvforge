"use client"

import type { InterviewSessionSummary } from "@cvforge/types"
import * as React from "react"
import { toast } from "sonner"

import { LatencyStrip } from "@/components/interview/studio/latency-strip"
import { VoiceOrb } from "@/components/interview/studio/voice-orb"
import { StudioToolbar } from "@/components/interview/studio/studio-toolbar"
import { TranscriptPanel } from "@/components/interview/studio/transcript-panel"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { ActionResult } from "@/lib/api"
import { orbState, orbVolumes } from "@/lib/interview/orb"
import {
  elapsedSeconds,
  resolveCountdown,
  shouldAutoFinish,
} from "@/lib/interview/countdown"
import { useAudioRecorder } from "@/hooks/interview/use-audio-recorder"
import { useInterviewTurn } from "@/hooks/interview/use-interview-turn"
import { useMicStream } from "@/hooks/interview/use-mic-stream"
import { useVad } from "@/hooks/interview/use-vad"
import {
  initialStudioState,
  studioReducer,
  type StudioMessage,
} from "@/lib/interview/studio-machine"

/** Phases where a new answer may begin. */
const LISTENING_PHASES = new Set(["listening", "recording"])

function toStudioMessages(session: InterviewSessionSummary): StudioMessage[] {
  return session.messages.map((message) => ({ ...message }))
}

/**
 * The live interview: microphone, voice detection, transcript and reply.
 *
 * All of the behaviour lives in `studioReducer` and the hooks; this wires them
 * together and renders. The session is passed in from the server component, so
 * a reload resumes where it left off with no client-side storage.
 */
export function InterviewStudio({
  session,
  onFinish,
}: {
  session: InterviewSessionSummary
  onFinish: () => Promise<ActionResult | void>
}) {
  const [state, dispatch] = React.useReducer(studioReducer, {
    ...initialStudioState,
    messages: toStudioMessages(session),
    startedAt: session.startedAt,
  })
  // Zero, not `Date.now()`: this component renders on the server too, and a
  // clock read there never matches the client's a moment later — React threw
  // the whole tree away as a hydration mismatch, which took the router with
  // it and is why finishing stopped navigating to the report. Zero renders
  // the full duration on both sides; the mount effect below corrects it.
  const [nowMs, setNowMs] = React.useState(0)
  const [finishing, setFinishing] = React.useState(false)

  const micRef = useMicStream({
    onError: (message) => dispatch({ message, type: "MIC_FAILED" }),
    onReady: () => dispatch({ type: "MIC_READY" }),
  })

  const { open, submit } = useInterviewTurn({ dispatch, sessionId: session.id })

  const recorder = useAudioRecorder({
    micRef,
    onError: (message) => dispatch({ message, type: "TRANSCRIBE_FAILED" }),
    onSegment: (segment) => void submit(segment),
  })

  useVad({
    active: LISTENING_PHASES.has(state.phase),
    micRef,
    muted: state.muted,
    onLevel: (level) => dispatch({ level, type: "LEVEL" }),
    // Too short to be an answer: the floor goes straight back to the
    // candidate, with nothing sent and no turn spent.
    onSpeechAbort: () => {
      dispatch({ type: "SPEECH_ABORTED" })
      recorder.cancel()
    },
    onSpeechEnd: () => {
      // Stamped before the recorder stops: encoding and uploading the answer
      // are part of the silence the candidate sits through, so the latency
      // shown has to include them.
      dispatch({ atMs: Date.now(), type: "SPEECH_END" })
      recorder.stop()
    },
    onSpeechStart: () => {
      dispatch({ type: "SPEECH_START" })
      recorder.start()
    },
    status: state.vadStatus,
  })

  // Muting mid-sentence drops the half-spoken answer. Without this the
  // recorder stayed alive and the microphone never worked again.
  const cancelRecording = recorder.cancel
  React.useEffect(() => {
    if (state.muted) cancelRecording()
  }, [cancelRecording, state.muted])

  // The recruiter opens the interview, not the candidate. Held until the
  // microphone is live so that the greeting cannot play while the VAD is
  // still off — the candidate's reply would be missed.
  const openedRef = React.useRef(state.messages.length > 0)
  React.useEffect(() => {
    if (openedRef.current || state.phase !== "listening") return

    openedRef.current = true
    void open()
  }, [open, state.phase])

  // Ticks a wall clock rather than a counter, so the countdown is derived
  // from the session's own start and a reload resumes instead of restarting.
  //
  // Deliberately mount-scoped. Keying this on the phase — to skip ticking
  // while booting or finished — tore the interval down and rebuilt it on
  // every transition, and an interview changes phase (listening, recording,
  // processing, speaking) far more often than once a second. The timer never
  // survived long enough to fire, `nowMs` stayed frozen at mount, and the
  // countdown read the full duration from start to finish.
  React.useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000)

    return () => clearInterval(interval)
  }, [])

  // Errors are surfaced once, as a toast, rather than accumulating on screen.
  React.useEffect(() => {
    if (state.error) toast.error(state.error)
  }, [state.error])

  const finish = React.useCallback(async () => {
    setFinishing(true)
    // Shuts the microphone for the analysis, so a stray noise cannot open a
    // turn against a session that is being closed.
    dispatch({ type: "FINISHED" })

    try {
      const result = await onFinish()

      // Scoring the session redirects to the report and never returns, so
      // reaching here at all means it failed. Saying nothing left the
      // candidate on a dead page wondering whether the click had registered.
      if (result && !result.ok) {
        dispatch({ message: result.message, type: "FINISH_FAILED" })
      }
    } finally {
      setFinishing(false)
    }
  }, [onFinish])

  const hasAnswered = state.messages.some((message) => message.role === "user")
  // From the reducer, not the prop: the prop was fetched before the first
  // turn existed, and the server stamps the start only when someone speaks.
  const elapsed = elapsedSeconds(state.startedAt, nowMs)
  const countdown = resolveCountdown(elapsed, session.durationMinutes)

  // Scores the interview on its own once the time is spent, and the redirect
  // in `finishInterview` carries the candidate to their report. Waits for a
  // gap: `shouldAutoFinish` will not stop a turn in progress.
  const autoFinish = shouldAutoFinish({
    durationMinutes: session.durationMinutes,
    elapsed,
    finishing,
    hasAnswered,
    phase: state.phase,
  })
  const autoFinishedRef = React.useRef(false)
  React.useEffect(() => {
    if (!autoFinish || autoFinishedRef.current) return

    autoFinishedRef.current = true
    void finish()
  }, [autoFinish, finish])

  const orb = orbState({ muted: state.muted, phase: state.phase })
  const volumes = orbVolumes({
    level: state.level,
    state: orb,
    voiceLevel: state.voiceLevel,
  })

  return (
    <div className="flex flex-col gap-4">
      {/* The stage: one thing to look at, the full width of the page. */}
      <section className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-xl border bg-card p-6">
        <VoiceOrb input={volumes.input} output={volumes.output} state={orb} />
        <LatencyStrip firstTokenMs={state.firstTokenMs} />

        {countdown.tone === "overtime" && state.phase !== "completed" ? (
          // Nothing is cut off mid-turn: the studio waits for a gap before
          // scoring, and the recruiter is already wrapping up.
          <Alert className="max-w-lg">
            <AlertDescription>
              Le temps imparti est écoulé — l’analyse se lancera dès que vous
              aurez fini de parler.
            </AlertDescription>
          </Alert>
        ) : null}
        {state.phase === "error" ? (
          <Alert className="max-w-lg" variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}
      </section>

      <StudioToolbar
        canFinish={hasAnswered}
        countdown={countdown}
        finishing={finishing}
        muted={state.muted}
        onFinish={() => void finish()}
        onToggleMute={() => dispatch({ type: "MUTE_TOGGLED" })}
        profile={session.profile}
      />

      {/* A height of its own, so new turns scroll the thread and not the page. */}
      <TranscriptPanel
        className="h-96 @4xl/main:h-[28rem]"
        messages={state.messages}
        streamingReply={state.streamingReply}
      />
    </div>
  )
}
