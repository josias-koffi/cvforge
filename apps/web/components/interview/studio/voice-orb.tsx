"use client"

import { useTheme } from "next-themes"
import * as React from "react"

import { Orb, type AgentState } from "@/components/ui/orb"
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion"
import { cn } from "@/lib/utils"
import { orbStateLabels } from "@/lib/interview/labels"
import type { OrbState } from "@/lib/interview/orb"

/**
 * A quiet stand-in: shown while the WebGL bundle arrives, and kept for good
 * for anyone who asked for less movement.
 */
function OrbFallback({ colors }: { colors?: [string, string] }) {
  return (
    <div
      aria-hidden="true"
      className="size-full rounded-full"
      style={
        colors
          ? {
              background: `radial-gradient(circle at 38% 32%, ${colors[0]}, ${colors[1]})`,
            }
          : undefined
      }
    />
  )
}

/**
 * Our states, said in the orb's own vocabulary.
 *
 * It describes the *agent*: "listening" is the recruiter listening to the
 * candidate — which covers both waiting for an answer and hearing one — and
 * "talking" is the recruiter itself.
 */
const agentStates: Record<OrbState, AgentState> = {
  idle: null,
  listening: "listening",
  muted: null,
  recording: "listening",
  speaking: "talking",
  thinking: "thinking",
}

/**
 * The gradient per state: a mid tone and a light one, in that order.
 *
 * Tints of the brand tokens rather than the tokens themselves. The shader
 * ramps luminance across black → colour 1 → colour 2 → white, so a saturated
 * `--primary` lands as a hard cobalt pinwheel; these are the same hues pulled
 * towards the light end, which is what gives the sphere its cloudy look.
 *
 * Hex because a shader cannot read an oklch custom property — a change to the
 * palette in `app/globals.css` has to be carried here by hand.
 */
const palettes: Record<"light" | "dark", Record<OrbState, [string, string]>> = {
  dark: {
    // Deeper, because the shader inverts its ramp under `.dark`.
    idle: ["#6B7A94", "#B7C2D4"],
    listening: ["#5B82FF", "#B9CBFF"],
    muted: ["#5A6474", "#A8B0BE"],
    recording: ["#F0A73E", "#FFD9A3"],
    speaking: ["#A78BFA", "#D8CBFF"],
    thinking: ["#7E9BFF", "#C7D5FF"],
  },
  light: {
    idle: ["#AAB3C2", "#DDE2EA"],
    listening: ["#7E9BFF", "#CBD9FF"],
    muted: ["#B3BAC5", "#E2E5EA"],
    recording: ["#FFC978", "#FFE7C2"],
    speaking: ["#B59BFB", "#E2D8FF"],
    thinking: ["#9DB6FF", "#D8E2FF"],
  },
}

/**
 * The interview, as one thing to look at.
 *
 * The sphere is ElevenLabs' (see `components/ui/orb.tsx`); what is ours is
 * what drives it. It runs in manual volume mode on purpose: left on "auto"
 * the orb animates a sine wave that looks like a voice without being one, and
 * the whole point here is that it moves with the real microphone and the
 * recruiter's real reply.
 *
 * The sphere is hidden from assistive tech: the state is also written out
 * below, and read out, because a sphere that swells says nothing to a screen
 * reader and colour alone would not meet WCAG 1.4.1.
 */
export function VoiceOrb({
  state,
  input,
  output,
  className,
}: {
  state: OrbState
  /** The candidate's microphone, 0-1. */
  input: number
  /** The recruiter's voice as it plays, 0-1. */
  output: number
  className?: string
}) {
  const { resolvedTheme } = useTheme()
  // The shader runs on its own render loop, which no CSS rule can stop: the
  // sphere becomes a still one rather than spinning through a preference the
  // rest of the app honours.
  const reducedMotion = usePrefersReducedMotion()
  // Read every frame by the shader, so they are refs rather than props: a
  // sixty-times-a-second re-render of a WebGL canvas is not affordable.
  const inputRef = React.useRef(input)
  const outputRef = React.useRef(output)

  // Written in an effect, not during render: React 19 forbids the latter.
  React.useEffect(() => {
    inputRef.current = input
    outputRef.current = output
  })

  const getInputVolume = React.useCallback(() => inputRef.current, [])
  const getOutputVolume = React.useCallback(() => outputRef.current, [])
  const palette = palettes[resolvedTheme === "dark" ? "dark" : "light"]

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* A socket: the sphere is drawn on a square canvas and its outer edge
          is straight, so it is masked to a circle the way upstream's own demo
          does. */}
      <div
        aria-hidden="true"
        className="size-48 overflow-hidden rounded-full bg-muted/50 shadow-[inset_0_2px_12px_rgba(0,0,0,0.08)] sm:size-56 dark:bg-muted/30 dark:shadow-[inset_0_2px_12px_rgba(0,0,0,0.35)]"
      >
        {reducedMotion ? (
          <OrbFallback colors={palette[state]} />
        ) : (
          <Orb
            agentState={agentStates[state]}
            colors={palette[state]}
            getInputVolume={getInputVolume}
            getOutputVolume={getOutputVolume}
            volumeMode="manual"
          />
        )}
      </div>

      <p aria-live="polite" className="text-sm font-medium">
        {orbStateLabels[state]}
      </p>
    </div>
  )
}
