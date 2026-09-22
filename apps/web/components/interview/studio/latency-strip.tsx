import type { PlaybackStats } from "@/lib/interview/playback-stats"
import { cn } from "@/lib/utils"

/** The perceived-latency target the interview loop is built around. */
export const LATENCY_TARGET_MS = 1200

/** Set in the environment to read the per-turn measurements on a real machine. */
export const DEBUG_ENABLED = process.env.NEXT_PUBLIC_INTERVIEW_DEBUG === "1"

const format = (value: number | null, unit: string) =>
  value === null ? "—" : `${Math.round(value)} ${unit}`

/**
 * How the last reply actually played.
 *
 * Behind a flag because none of it is the candidate's business, and a running
 * count of dropouts beside their own interview would be its own kind of
 * stressful. Deliberately not an `aria-live` region: a screen reader would
 * read the numbers out again after every turn.
 */
function PlaybackDebug({ playback }: { playback: PlaybackStats }) {
  const rows = [
    ["Trous", `${playback.underruns} / ${playback.frames}`],
    ["Frames désalignées", String(playback.misalignedFrames)],
    ["Marge p50", format(playback.leadP50Ms, "ms")],
    ["Marge min", format(playback.leadMinMs, "ms")],
    ["Encodage", format(playback.encodeMs, "ms")],
    ["Envoi", format(playback.uploadMs, "ms")],
  ]

  return (
    <dl className="mt-1 grid grid-cols-2 gap-x-3 text-xs text-muted-foreground sm:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-1">
          <dt>{label}</dt>
          <dd className="font-medium tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Time to the recruiter's first word. Shown because it is the number the whole
 * pipeline is tuned for, and a regression here is otherwise invisible.
 *
 * It counts to the moment the first frame becomes *audible*, not the moment it
 * arrives: frames are queued ahead of the speakers, and the wait the candidate
 * sits through ends when they hear something.
 */
export function LatencyStrip({
  firstTokenMs,
  playback = null,
}: {
  firstTokenMs: number | null
  playback?: PlaybackStats | null
}) {
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
      {DEBUG_ENABLED && playback !== null ? (
        <PlaybackDebug playback={playback} />
      ) : null}
    </div>
  )
}
