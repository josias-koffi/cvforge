import { cn } from "@/lib/utils"

/** The perceived-latency target the interview loop is built around. */
export const LATENCY_TARGET_MS = 1200

/**
 * Time to the recruiter's first word. Shown because it is the number the whole
 * pipeline is tuned for, and a regression here is otherwise invisible.
 *
 * It counts to the moment the voice starts coming out of the speakers, not to
 * when the reply was generated: the wait the candidate sits through ends when
 * they hear something.
 */
export function LatencyStrip({ firstTokenMs }: { firstTokenMs: number | null }) {
  if (firstTokenMs === null) return null

  const withinTarget = firstTokenMs <= LATENCY_TARGET_MS

  return (
    <div>
      <p className="text-xs text-muted-foreground">
        Première réponse en{" "}
        <span
          className={cn(
            "font-medium tabular-nums",
            withinTarget ? "text-success" : "text-warning"
          )}
        >
          {(firstTokenMs / 1000).toFixed(1)} s
        </span>{" "}
        {/* Spelled out, not just coloured: WCAG 1.4.1. */}
        {withinTarget ? "— dans la cible" : `— au-delà de ${LATENCY_TARGET_MS / 1000} s`}
      </p>
    </div>
  )
}
