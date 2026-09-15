import { ZapIcon } from "lucide-react"

import { Spinner } from "@/components/ui/spinner"

/** Button body shared by action/submit buttons: spinner (or pulsing spark) while pending. */
export function PendingContent({
  children,
  pending,
  pendingLabel,
  spark,
}: {
  children: React.ReactNode
  pending: boolean
  pendingLabel?: string
  spark?: boolean
}) {
  if (!pending) return children

  return (
    <>
      {spark ? <ZapIcon className="motion-safe:animate-pulse" /> : <Spinner />}
      {pendingLabel ?? children}
    </>
  )
}

/** Classes for a button that triggers an AI generation ("spark moment"). */
export function sparkClassName(pending: boolean) {
  return pending ? "spark-shimmer disabled:opacity-100" : undefined
}
