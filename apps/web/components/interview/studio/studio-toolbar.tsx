"use client"

import { MicOffIcon, MicIcon, PauseIcon, SquareIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { profileLabels } from "@/lib/interview/labels"
import type { CountdownState } from "@/lib/interview/countdown"
import type { InterviewRecruiterProfile } from "@cvforge/types"

/** Spelled out, never signalled by colour alone — WCAG 1.4.1. */
const TONE_LABELS: Record<CountdownState["tone"], string> = {
  overtime: "temps écoulé",
  running: "restant",
  wrapup: "dernière minute",
}

const TONE_CLASSES: Record<CountdownState["tone"], string> = {
  overtime: "text-warning",
  running: "text-muted-foreground",
  wrapup: "text-warning",
}

export function StudioToolbar({
  countdown,
  muted,
  profile,
  canFinish,
  finishing,
  onToggleMute,
  onFinish,
  canPause,
  onPause,
}: {
  countdown: CountdownState
  muted: boolean
  profile: InterviewRecruiterProfile
  canFinish: boolean
  finishing: boolean
  onToggleMute: () => void
  onFinish: () => void
  canPause: boolean
  onPause: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Badge variant="outline">{profileLabels[profile]}</Badge>
        <span
          // Polite, so the last minute is announced without interrupting the
          // candidate mid-answer.
          aria-live="polite"
          className={cn(
            "font-mono text-sm tabular-nums",
            TONE_CLASSES[countdown.tone]
          )}
        >
          {countdown.label}{" "}
          <span className="font-sans">{TONE_LABELS[countdown.tone]}</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          aria-pressed={muted}
          onClick={onToggleMute}
          type="button"
          variant="outline"
        >
          {muted ? <MicOffIcon /> : <MicIcon />}
          {muted ? "Réactiver le micro" : "Couper le micro"}
        </Button>
        <Button
          disabled={!canPause || finishing}
          onClick={onPause}
          type="button"
          variant="outline"
        >
          <PauseIcon />
          Pause
        </Button>
        <Button
          disabled={!canFinish || finishing}
          onClick={onFinish}
          type="button"
          variant="default"
        >
          <SquareIcon />
          {finishing ? "Analyse en cours…" : "Terminer et analyser"}
        </Button>
      </div>
    </div>
  )
}
