import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"
import { orbStateLabels } from "@/lib/interview/labels"
import type { OrbState } from "@/lib/interview/orb"

/**
 * The colour of each state, as a design token rather than a Tailwind class:
 * the SVG reads it from `--orb`, and the token is already redefined for dark
 * mode, so nothing here has to know which theme is on.
 */
const tones: Record<OrbState, string> = {
  idle: "var(--muted-foreground)",
  listening: "var(--primary)",
  recording: "var(--spark)",
  thinking: "var(--chart-2)",
  speaking: "var(--chart-5)",
  muted: "var(--muted-foreground)",
}

/**
 * The interview, as one thing to look at.
 *
 * Three blurred ellipses drifting out of phase read as a single body that
 * breathes; `amplitude` — the live level of whoever holds the floor — scales
 * the whole thing, so the sphere swells on the candidate's voice and on the
 * recruiter's reply alike.
 *
 * The SVG is decoration and is hidden from assistive tech: the state is also
 * written out below, and read out, because a sphere that swells says nothing
 * to a screen reader and colour alone would not meet WCAG 1.4.1.
 */
export function VoiceOrb({
  state,
  amplitude,
  className,
}: {
  state: OrbState
  amplitude: number
  className?: string
}) {
  const quiet = state === "idle" || state === "muted"

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div
        className="relative size-40 sm:size-48"
        style={
          {
            "--amp": amplitude,
            "--orb": tones[state],
          } as CSSProperties
        }
      >
        {/* The glow that spills past the sphere and makes it sit in the page. */}
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-0 rounded-full blur-2xl transition-opacity duration-500",
            quiet ? "opacity-20" : "opacity-45"
          )}
          style={{
            background:
              "radial-gradient(circle at 50% 50%, var(--orb), transparent 68%)",
          }}
        />

        <svg
          aria-hidden="true"
          className="relative size-full"
          viewBox="-100 -100 200 200"
        >
          <defs>
            <radialGradient cx="38%" cy="32%" id="orb-core" r="72%">
              <stop offset="0%" stopColor="var(--orb)" stopOpacity="0.95" />
              <stop offset="55%" stopColor="var(--orb)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="var(--orb)" stopOpacity="0.12" />
            </radialGradient>
            <filter
              height="220%"
              id="orb-goo"
              width="220%"
              x="-60%"
              y="-60%"
            >
              <feGaussianBlur stdDeviation="5" />
            </filter>
            <radialGradient cx="34%" cy="26%" id="orb-sheen" r="46%">
              <stop offset="0%" stopColor="var(--card)" stopOpacity="0.75" />
              <stop offset="100%" stopColor="var(--card)" stopOpacity="0" />
            </radialGradient>
          </defs>

          <g className="orb-pulse">
            {/* Plain classes, not `motion-safe:` variants: the global
                prefers-reduced-motion rule in globals.css already stops
                every animation here, and a variant cannot reach a hand-
                written class anyway. */}
            <g className={cn("orb-breathe", quiet && "opacity-60")}>
              {/* Off-centre on purpose: concentric ellipses rotate into
                  themselves and the sphere stays a circle. Each bulge sits to
                  one side, so the silhouette is never the same twice. */}
              <g filter="url(#orb-goo)" opacity="0.6">
                <ellipse
                  className="orb-layer orb-layer-a"
                  cx="-9"
                  cy="5"
                  rx="52"
                  ry="41"
                />
                <ellipse
                  className="orb-layer orb-layer-b"
                  cx="8"
                  cy="-7"
                  rx="41"
                  ry="54"
                />
                <ellipse
                  className="orb-layer orb-layer-c"
                  cx="3"
                  cy="9"
                  rx="54"
                  ry="46"
                />
              </g>

              <circle fill="url(#orb-core)" r="44" />
              {/* The highlight that makes it a sphere rather than a disc. */}
              <circle fill="url(#orb-sheen)" r="44" />
              <circle
                fill="none"
                r="52"
                stroke="var(--orb)"
                strokeOpacity="0.35"
                strokeWidth="1.5"
              />
            </g>
          </g>

          {/* Only while an answer is being analysed: something is happening
              that the candidate cannot hear, so it has to be visible. */}
          {state === "thinking" ? (
            <circle
              className="orb-ring-spin"
              fill="none"
              r="62"
              stroke="var(--orb)"
              strokeDasharray="10 22"
              strokeLinecap="round"
              strokeOpacity="0.7"
              strokeWidth="2.5"
            />
          ) : null}
        </svg>
      </div>

      <p aria-live="polite" className="text-sm font-medium">
        {orbStateLabels[state]}
      </p>
    </div>
  )
}
