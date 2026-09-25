import { formatCount, formatRate, ratio } from "@/lib/admin-metrics/format"

/**
 * One step of a funnel. `count` null means "not measured", not zero.
 * `against` is the index of the step its rate is taken from, when that is not
 * the one just before — two steps can both follow a third.
 */
export type FunnelStep = {
  label: string
  count: number | null
  against?: number
}

const PERCENT = 100

/**
 * A funnel as horizontal bars, each against the first step, with the rate
 * against the step before and against the start in text. No rate after an
 * empty step: on a funnel nobody entered yet, "0 %" reads as a failure.
 */
export function FunnelSteps({
  showFromStart = true,
  steps,
}: {
  showFromStart?: boolean
  steps: readonly FunnelStep[]
}) {
  const start = steps[0]?.count ?? 0

  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step, index) => {
        const previous =
          index > 0 ? steps[step.against ?? index - 1]!.count : null
        const width =
          step.count !== null && start > 0 ? (step.count / start) * PERCENT : 0

        return (
          <li key={step.label} className="space-y-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span>{step.label}</span>
              <span className="tabular-nums">
                <span className="font-medium">
                  {step.count === null ? "—" : formatCount(step.count)}
                </span>
                {index > 0 ? (
                  <StepRates
                    count={step.count}
                    previous={previous}
                    start={showFromStart && index > 1 ? start : null}
                  />
                ) : null}
              </span>
            </div>
            <div
              aria-hidden
              className="h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary"
                data-slot="funnel-bar"
                style={{ width: `${width}%` }}
              />
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function StepRates({
  count,
  previous,
  start,
}: {
  count: number | null
  previous: number | null
  start: number | null
}) {
  if (count === null || !previous) return null

  const fromStart = start ? ratio(count, start) : null

  return (
    <span className="text-muted-foreground">
      {" · "}
      {formatRate(roundRate(ratio(count, previous)))}
      {fromStart === null
        ? null
        : ` (${formatRate(roundRate(fromStart))} du départ)`}
    </span>
  )
}

/** Funnel rates read better whole: "33 %", not "33,3 %". */
function roundRate(rate: number | null) {
  return rate === null ? null : Math.round(rate)
}
