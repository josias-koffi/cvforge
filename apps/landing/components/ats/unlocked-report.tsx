import { CircleAlertIcon, InfoIcon, TriangleAlertIcon } from "lucide-react"

import { BAND_FILL, BAND_TEXT, bandFor } from "@/components/ats/score-gauge"
import { stagger } from "@/components/ats/stagger"
import type { LandingDictionary } from "@/content/types"
import type { AtsFinding, AtsUnlockResult } from "@/lib/ats-api"
import { cn } from "@/lib/utils"

const SEVERITY_ICON: Record<AtsFinding["severity"], typeof InfoIcon> = {
  critical: CircleAlertIcon,
  warning: TriangleAlertIcon,
  info: InfoIcon,
}

const SEVERITY_TEXT: Record<AtsFinding["severity"], string> = {
  critical: "text-destructive",
  warning: "text-warning",
  info: "text-muted-foreground",
}

/** The detail traded for the email: a bar per dimension, then every finding. */
export function UnlockedReport({
  dictionary,
  report,
}: {
  dictionary: LandingDictionary["ats"]
  report: AtsUnlockResult
}) {
  const scored = report.result.dimensions.filter(
    (dimension) => dimension.status === "scored"
  )

  return (
    <div className="mt-6 animate-rise-in border-t pt-6">
      <h3 className="font-medium">{dictionary.unlock.success}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {dictionary.unlock.successBody}
      </p>

      <dl className="mt-5 space-y-3">
        {scored.map((dimension, index) => {
          const score = dimension.score ?? 0
          const band = bandFor(score)

          return (
            <div key={dimension.key}>
              <div className="flex justify-between gap-4 text-sm">
                <dt>{dictionary.dimensions[dimension.key] ?? dimension.key}</dt>
                <dd className={cn("font-medium tabular-nums", BAND_TEXT[band])}>
                  {score} / 100
                </dd>
              </div>
              <div
                aria-hidden="true"
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={cn(
                    "h-full origin-left animate-bar-fill rounded-full",
                    BAND_FILL[band]
                  )}
                  style={{
                    width: `${Math.max(0, Math.min(100, score))}%`,
                    animationDelay: `${index * 80}ms`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </dl>

      {report.result.findings.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {report.result.findings.map((finding, index) => {
            const Icon = SEVERITY_ICON[finding.severity]

            return (
              <li
                className="flex rise-in items-start gap-2.5 rounded-lg bg-muted/40 px-3 py-2 text-sm"
                key={finding.code}
                style={stagger(scored.length + index)}
              >
                <Icon
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    SEVERITY_TEXT[finding.severity]
                  )}
                />
                <span>{dictionary.findings[finding.code] ?? finding.code}</span>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
