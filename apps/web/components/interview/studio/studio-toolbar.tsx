"use client"

import { MicOffIcon, MicIcon, SquareIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { profileLabels } from "@/lib/interview/labels"
import type { InterviewRecruiterProfile } from "@cvforge/types"

/** mm:ss — an interview is minutes long, never hours. */
function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60)

  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
}

export function StudioToolbar({
  elapsedSeconds,
  muted,
  profile,
  canFinish,
  finishing,
  onToggleMute,
  onFinish,
}: {
  elapsedSeconds: number
  muted: boolean
  profile: InterviewRecruiterProfile
  canFinish: boolean
  finishing: boolean
  onToggleMute: () => void
  onFinish: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Badge variant="outline">{profileLabels[profile]}</Badge>
        <span
          aria-label={`Durée de la session : ${formatElapsed(elapsedSeconds)}`}
          className="font-mono text-sm tabular-nums text-muted-foreground"
        >
          {formatElapsed(elapsedSeconds)}
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
