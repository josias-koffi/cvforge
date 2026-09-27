import { CheckIcon } from "lucide-react"

import { ONBOARDING_STEPS } from "@/lib/onboarding-steps"
import { cn } from "@/lib/utils"

/**
 * Where the candidate is: every step by name on a wide screen, a bar and a
 * count on a phone. Past steps are ticked, the current one ringed.
 */
export function OnboardingStepper({ current }: { current: number }) {
  const total = ONBOARDING_STEPS.length
  const progress = Math.round(((current + 1) / total) * 100)

  return (
    <nav aria-label="Étapes de la prise en main" className="w-full">
      <div
        aria-hidden
        className="h-1 overflow-hidden rounded-full bg-muted md:hidden"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-spark"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ol className="hidden items-center gap-2 md:flex">
        {ONBOARDING_STEPS.map((step, index) => {
          const done = index < current
          const active = index === current

          return (
            <li
              key={step.id}
              aria-current={active ? "step" : undefined}
              className="flex flex-1 items-center gap-2 last:flex-none"
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary text-primary ring-4 ring-primary/15",
                  !done && !active && "text-muted-foreground"
                )}
              >
                {done ? <CheckIcon className="size-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-xs whitespace-nowrap",
                  active ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
              {index < total - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "h-px min-w-4 flex-1 transition-colors",
                    done ? "bg-primary" : "bg-border"
                  )}
                />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
