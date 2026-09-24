import type { ReactNode } from "react"
import { ZapIcon } from "lucide-react"

/**
 * The app's "AI at work" look, for a `spark` button: a highlight sweeping
 * across it and a pulsing bolt. Mirrors `PendingContent` in apps/web so the
 * visitor meets the same wave here as when the product generates a CV.
 */
export function SparkPending({
  pending,
  pendingLabel,
  children,
}: {
  pending: boolean
  pendingLabel: string
  children: ReactNode
}) {
  if (!pending) return children

  return (
    <>
      <ZapIcon className="motion-safe:animate-pulse" />
      {pendingLabel}
    </>
  )
}

/** Keeps the button fully opaque while disabled, so the wave stays visible. */
export function sparkPendingClassName(pending: boolean) {
  return pending ? "spark-shimmer disabled:opacity-100" : undefined
}
