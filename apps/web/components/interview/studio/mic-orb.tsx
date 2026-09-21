import { MicIcon, MicOffIcon, LoaderIcon, AudioLinesIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { vadStatusLabels } from "@/lib/interview/labels"
import type { VadStatus } from "@/lib/interview/vad"

const icons = {
  listening: MicIcon,
  recording: AudioLinesIcon,
  processing: LoaderIcon,
  muted: MicOffIcon,
} as const

const tones: Record<VadStatus, string> = {
  listening: "border-border bg-card text-muted-foreground",
  recording: "border-spark bg-spark/10 text-spark-foreground",
  processing: "border-warning bg-warning/10 text-warning",
  muted: "border-border bg-muted text-muted-foreground",
}

/**
 * The microphone's state, as one thing to look at while speaking.
 *
 * The halo tracks the live level, but it is decoration: the state is also
 * written out, and read out, because a ring that grows says nothing to a
 * screen reader and colour alone would not meet WCAG 1.4.1.
 */
export function MicOrb({
  status,
  level,
}: {
  status: VadStatus
  level: number
}) {
  const Icon = icons[status]
  const scale = 1 + Math.min(level, 1) * 0.35

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex size-28 items-center justify-center">
        {status === "recording" ? (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-spark/20 transition-transform duration-75"
            style={{ transform: `scale(${scale})` }}
          />
        ) : null}
        <div
          className={cn(
            "relative flex size-20 items-center justify-center rounded-full border-2 transition-colors",
            tones[status]
          )}
        >
          <Icon
            aria-hidden="true"
            className={cn("size-8", status === "processing" && "animate-spin")}
          />
        </div>
      </div>
      <p aria-live="polite" className="text-sm font-medium">
        {vadStatusLabels[status]}
      </p>
    </div>
  )
}
