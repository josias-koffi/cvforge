import { cn } from "@/lib/utils"
import type { LandingDictionary } from "@/content/types"

type Band = "weak" | "fair" | "good" | "excellent"

const BAND_STYLES: Record<Band, string> = {
  weak: "text-destructive",
  fair: "text-warning",
  good: "text-info",
  excellent: "text-success",
}

const BAND_TRACK: Record<Band, string> = {
  weak: "stroke-destructive",
  fair: "stroke-warning",
  good: "stroke-info",
  excellent: "stroke-success",
}

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * The score, as a ring and as a number.
 *
 * The band is always spelled out next to it: colour alone never carries the
 * verdict, both because a quarter of readers would miss it and because "72"
 * means nothing without knowing whether that is good.
 */
export function ScoreGauge({
  score,
  band,
  dictionary,
}: {
  score: number
  band: Band
  dictionary: LandingDictionary["ats"]["result"]
}) {
  const offset = CIRCUMFERENCE * (1 - Math.max(0, Math.min(100, score)) / 100)

  return (
    <figure className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg
          aria-hidden="true"
          className="-rotate-90"
          height="128"
          viewBox="0 0 128 128"
          width="128"
        >
          <circle
            className="stroke-border"
            cx="64"
            cy="64"
            fill="none"
            r={RADIUS}
            strokeWidth="10"
          />
          <circle
            className={cn(BAND_TRACK[band], "transition-[stroke-dashoffset] duration-700")}
            cx="64"
            cy="64"
            fill="none"
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
            strokeWidth="10"
          />
        </svg>
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 flex items-center justify-center text-4xl font-semibold tabular-nums",
            BAND_STYLES[band]
          )}
        >
          {score}
        </span>
      </div>
      {/* The whole verdict in one sentence, which is what a screen reader announces. */}
      <figcaption className="text-center">
        <span className="sr-only">
          {`${dictionary.scoreLabel} : ${score} ${dictionary.outOf} — ${dictionary.bands[band]}`}
        </span>
        <span aria-hidden="true" className="block text-sm text-muted-foreground">
          {dictionary.scoreLabel} · {dictionary.outOf}
        </span>
        <span
          aria-hidden="true"
          className={cn("block text-lg font-medium", BAND_STYLES[band])}
        >
          {dictionary.bands[band]}
        </span>
      </figcaption>
    </figure>
  )
}
