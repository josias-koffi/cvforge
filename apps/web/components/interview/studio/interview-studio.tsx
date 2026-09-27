"use client"

import type { InterviewSessionSummary } from "@cvforge/types"
import * as React from "react"
import { toast } from "sonner"

import { LatencyStrip } from "@/components/interview/studio/latency-strip"
import { VoiceOrb } from "@/components/interview/studio/voice-orb"
import { StudioToolbar } from "@/components/interview/studio/studio-toolbar"
import { TranscriptPanel } from "@/components/interview/studio/transcript-panel"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { ActionResult } from "@/lib/api"
import { orbState, orbVolumes } from "@/lib/interview/orb"
import {
  elapsedSeconds,
  resolveCountdown,
  shouldAutoFinish,
} from "@/lib/interview/countdown"
import { useRealtimeCall } from "@/hooks/interview/use-realtime-call"
import {
  initialStudioState,
  studioReducer,
  type StudioMessage,
} from "@/lib/interview/studio-machine"

/** Where a pause makes sense: the call is up. */
const LIVE_PHASES = new Set(["listening", "recording", "processing", "speaking"])

function toStudioMessages(session: InterviewSessionSummary): StudioMessage[] {
  return session.messages.map((message) => ({ ...message }))
}

/**
 * The live interview: one call with the recruiter, and its transcript.
 *
 * All of the behaviour lives in `studioReducer` and the call hook; this wires
 * them together and renders. The session is passed in from the server component, so
 * a reload resumes where it left off with no client-side storage.
 */
export function InterviewStudio({
  session,
  onFinish,
}: {
  session: InterviewSessionSummary
  /**
   * The server action itself, not a wrapper around it.
   *
   * The page used to pass an inline `"use server"` closure that captured
   * `sessionId`. Next.js gives such a closure its own encrypted server
   * reference, and staging rejected it: `Server Reference ID did not match the
   * expected format. Received "x"` — so finishing did nothing at all. The id
   * travels as an argument instead, and what crosses the boundary is the
   * top-level action's own 42-character reference.
   */
  onFinish: (sessionId: string) => Promise<ActionResult | void>
}) {
  const [state, dispatch] = React.useReducer(studioReducer, {
    ...initialStudioState,
    messages: toStudioMessages(session),
    // A paused interview reopens paused: the candidate resumes when ready.
    pausedAt: session.pausedAt ?? null,
    phase: session.pausedAt ? "paused" : initialStudioState.phase,
    startedAt: session.startedAt,
  })
  // Zero, not `Date.now()`: this component renders on the server too, and a
  // clock read there never matches the client's a moment later — React threw
  // the whole tree away as a hydration mismatch, which took the router with
  // it and is why finishing stopped navigating to the report. Zero renders
  // the full duration on both sides; the mount effect below corrects it.
  const [nowMs, setNowMs] = React.useState(0)
  const [finishing, setFinishing] = React.useState(false)

  const { connect, hangup, pause } = useRealtimeCall({
    dispatch,
    muted: state.muted,
    sessionId: session.id,
  })

  // The call opens with the page: the candidate chose to start the interview
  // on the previous screen, and the recruiter speaks first. Hung up on
  // unmount — and in development React unmounts once straight away, so the
  // call has to open again on the second mount rather than be skipped.
  const startPausedRef = React.useRef(Boolean(session.pausedAt))
  React.useEffect(() => {
    if (!startPausedRef.current) void connect()

    return hangup
  }, [connect, hangup])

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
    // The call ends before scoring, so nothing said after this point is lost
    // to a report that has already been written.
    hangup()
    dispatch({ type: "FINISHED" })

    try {
      const result = await onFinish(session.id)

      // Scoring the session redirects to the report and never returns, so
      // reaching here at all means it failed. Saying nothing left the
      // candidate on a dead page wondering whether the click had registered.
      if (result && !result.ok) {
        dispatch({ message: result.message, type: "FINISH_FAILED" })
      }
    } finally {
      setFinishing(false)
    }
  }, [hangup, onFinish, session.id])

  const hasAnswered = state.messages.some((message) => message.role === "user")
  // From the reducer, not the prop: the prop was fetched before the first
  // turn existed, and the server stamps the start only when someone speaks.
  // Frozen while paused: the server moves the start forward on resume.
  const elapsed = elapsedSeconds(
    state.startedAt,
    state.pausedAt ? Date.parse(state.pausedAt) : nowMs
  )
  const countdown = resolveCountdown(elapsed, session.durationMinutes)

  // Scores the interview on its own once the time is spent, and the redirect
  // in `finishInterview` carries the candidate to their report. Waits for a
  // gap: `shouldAutoFinish` will not stop a turn in progress.
  const autoFinish = shouldAutoFinish({
    concluded: state.concluded,
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
        {state.phase === "paused" ? (
          <Alert className="max-w-lg">
            <AlertDescription className="flex flex-col items-start gap-3">
              Entretien en pause — le chronomètre est arrêté. Reprenez quand
              vous êtes prêt : le recruteur repartira là où vous en étiez.
              <Button onClick={() => void connect()} size="sm">
                Reprendre l’entretien
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {state.phase === "error" ||
        (state.phase === "ended" && !state.concluded && !autoFinish) ? (
          <Alert
            className="max-w-lg"
            variant={state.phase === "error" ? "destructive" : "default"}
          >
            <AlertDescription className="flex flex-col items-start gap-3">
              {state.phase === "error"
                ? state.error
                : "L’appel avec le recruteur a été coupé. Vous pouvez le reprendre là où vous en étiez."}
              <Button onClick={() => void connect()} size="sm" variant="outline">
                Reprendre l’appel
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
      </section>

      <StudioToolbar
        canFinish={hasAnswered}
        countdown={countdown}
        finishing={finishing}
        muted={state.muted}
        onFinish={() => void finish()}
        canPause={LIVE_PHASES.has(state.phase)}
        onPause={() => void pause()}
        onToggleMute={() => dispatch({ type: "MUTE_TOGGLED" })}
        profile={session.profile}
      />

      {/* A height of its own, so new turns scroll the thread and not the page. */}
      <TranscriptPanel
        className="h-96 @4xl/main:h-[28rem]"
        messages={state.messages.filter((message) => message.content.length > 0)}
        streamingReply={state.streamingReply}
      />
    </div>
  )
}
