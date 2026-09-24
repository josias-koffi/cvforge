"use client"

import { useEffect } from "react"
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react"

import { cn } from "@/lib/utils"
import type { LandingDictionary } from "@/content/types"

export type Band = "weak" | "fair" | "good" | "excellent"

export const BAND_TEXT: Record<Band, string> = {
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

export const BAND_FILL: Record<Band, string> = {
  weak: "bg-destructive",
  fair: "bg-warning",
  good: "bg-info",
  excellent: "bg-success",
}

/** Same floors as `bandFor` in @cvforge/ats-score, used for per-dimension bars. */
export function bandFor(score: number): Band {
  if (score >= 85) return "excellent"
  if (score >= 70) return "good"
  if (score >= 50) return "fair"
  return "weak"
}

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const EASE_SPARK = [0.2, 0.8, 0.2, 1] as const

/**
 * The score, as a ring and as a number.
 *
 * The band is always spelled out next to it: colour alone never carries the
 * verdict, both because a quarter of readers would miss it and because "72"
 * means nothing without knowing whether that is good.
 *
 * The markup always holds the final values; the ring filling up and the number
 * counting are layered on top, so reduced motion simply shows the result.
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
          height="144"
          viewBox="0 0 128 128"
          width="144"
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
            className={cn(BAND_TRACK[band], "animate-gauge-fill")}
            cx="64"
            cy="64"
            fill="none"
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
            strokeWidth="10"
            style={{ "--gauge-from": CIRCUMFERENCE } as React.CSSProperties}
          />
        </svg>
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 flex items-center justify-center text-5xl font-semibold tabular-nums",
            BAND_TEXT[band]
          )}
        >
          <CountUp value={score} />
        </span>
      </div>
      {/* The whole verdict in one sentence, which is what a screen reader announces. */}
      <figcaption className="text-center">
        <span className="sr-only">
          {`${dictionary.scoreLabel} : ${score} ${dictionary.outOf} — ${dictionary.bands[band]}`}
        </span>
        <span
          aria-hidden="true"
          className="block text-sm text-muted-foreground"
        >
          {dictionary.scoreLabel} · {dictionary.outOf}
        </span>
        {/* Named once the ring has settled, like a verdict after the count. */}
        <span
          aria-hidden="true"
          className={cn(
            "mt-1 inline-block animate-rise-in text-lg font-medium [animation-delay:800ms]",
            BAND_TEXT[band]
          )}
        >
          {dictionary.bands[band]}
        </span>
      </figcaption>
    </figure>
  )
}

/** Counts from 0 up to `value`; renders `value` straight away on the server. */
function CountUp({ value }: { value: number }) {
  const reduceMotion = useReducedMotion()
  const count = useMotionValue(value)
  const rounded = useTransform(count, (latest) => Math.round(latest))

  useEffect(() => {
    if (reduceMotion) {
      count.set(value)
      return
    }

    const controls = animate(count, value, {
      from: 0,
      duration: 1,
      ease: EASE_SPARK,
    })

    return () => controls.stop()
  }, [count, value, reduceMotion])

  return <motion.span>{rounded}</motion.span>
}
