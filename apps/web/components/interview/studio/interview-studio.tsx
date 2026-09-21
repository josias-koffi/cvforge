"use client"

import type { InterviewSessionSummary } from "@cvforge/types"
import * as React from "react"
import { toast } from "sonner"

import { LatencyStrip } from "@/components/interview/studio/latency-strip"
import { MicOrb } from "@/components/interview/studio/mic-orb"
import { StudioToolbar } from "@/components/interview/studio/studio-toolbar"
import { TranscriptPanel } from "@/components/interview/studio/transcript-panel"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  onFinish: () => Promise<void>
}) {
  const [state, dispatch] = React.useReducer(studioReducer, {
    ...initialStudioState,
    messages: toStudioMessages(session),
  })
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0)
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

  // The timer runs from the moment the microphone is live.
  React.useEffect(() => {
    if (state.phase === "booting" || state.phase === "completed") return

    const interval = setInterval(
      () => setElapsedSeconds((seconds) => seconds + 1),
      1000
    )

    return () => clearInterval(interval)
  }, [state.phase])

  // Errors are surfaced once, as a toast, rather than accumulating on screen.
  React.useEffect(() => {
    if (state.error) toast.error(state.error)
  }, [state.error])

  async function finish() {
    setFinishing(true)
    dispatch({ type: "FINISHED" })

    try {
      await onFinish()
    } finally {
      setFinishing(false)
    }
  }

  const hasAnswered = state.messages.some((message) => message.role === "user")

  return (
    <div className="grid gap-6 @4xl/main:grid-cols-[280px_1fr]">
      <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-6">
        <MicOrb level={state.level} status={state.vadStatus} />
        <LatencyStrip firstTokenMs={state.firstTokenMs} />
        {state.phase === "error" ? (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <div className="flex min-h-[28rem] flex-col gap-4">
        <StudioToolbar
          canFinish={hasAnswered}
          elapsedSeconds={elapsedSeconds}
          finishing={finishing}
          muted={state.muted}
          onFinish={() => void finish()}
          onToggleMute={() => dispatch({ type: "MUTE_TOGGLED" })}
          profile={session.profile}
        />
        <div className="min-h-0 flex-1">
          <TranscriptPanel
            messages={state.messages}
            streamingReply={state.streamingReply}
          />
        </div>
      </div>
    </div>
  )
}
