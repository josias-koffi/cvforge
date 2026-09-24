"use client"

import { useEffect, useState } from "react"
import { CircleCheckIcon, LoaderCircleIcon } from "lucide-react"

import type { LandingDictionary } from "@/content/types"
import { cn } from "@/lib/utils"

const STEP_MS = 900

/**
 * Paces the wait while the scan runs, one step at a time.
 *
 * The steps follow what the engine does, not how far it got: nothing reports
 * progress back. So the last step never ticks on its own — it spins until the
 * result replaces this whole block, and the page never claims to be done early.
 */
export function ScanProgress({
  dictionary,
}: {
  dictionary: LandingDictionary["ats"]["progress"]
}) {
  const [current, setCurrent] = useState(0)
  const last = dictionary.steps.length - 1

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrent((step) => Math.min(step + 1, last))
    }, STEP_MS)

    return () => window.clearInterval(timer)
  }, [last])

  return (
    <div className="mt-6 animate-rise-in rounded-xl border bg-muted/40 p-4">
      <p className="text-sm font-medium">{dictionary.title}</p>
      <ol className="mt-3 space-y-2">
        {dictionary.steps.slice(0, current + 1).map((step, index) => {
          const done = index < current

          return (
            <li
              aria-current={done ? undefined : "step"}
              className={cn(
                "flex animate-rise-in items-center gap-2 text-sm transition-colors",
                done ? "text-muted-foreground" : "text-foreground"
              )}
              key={step}
            >
              {done ? (
                <CircleCheckIcon className="size-4 shrink-0 text-success" />
              ) : (
                <LoaderCircleIcon className="size-4 shrink-0 animate-spin text-primary" />
              )}
              {step}
            </li>
          )
        })}
      </ol>
      {/* Only the step in progress is announced, not the whole list each time. */}
      <p aria-live="polite" className="sr-only">
        {dictionary.steps[current]}
      </p>
    </div>
  )
}
