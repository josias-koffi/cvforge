import { CircleAlertIcon, InfoIcon, TriangleAlertIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ATS_DIMENSION_LABELS,
  ATS_FINDING_FIXES,
  ATS_FINDING_LABELS,
  ATS_SEVERITY_LABELS,
  sortFindings,
  type AtsReportFinding,
  type AtsReportResult,
} from "@/lib/ats-report"
import { cn } from "@/lib/utils"

const SEVERITY_ICON: Record<AtsReportFinding["severity"], typeof InfoIcon> = {
  critical: CircleAlertIcon,
  warning: TriangleAlertIcon,
  info: InfoIcon,
}

const SEVERITY_TEXT: Record<AtsReportFinding["severity"], string> = {
  critical: "text-destructive",
  warning: "text-warning",
  info: "text-muted-foreground",
}

/**
 * The detail of a score — a landing scan or a generated CV — criterion by
 * criterion then point by point, each point with what to change. The value
 * is always written out: the bars are decoration.
 */
export function AtsReport({
  result,
  findingsFirst = false,
}: {
  result: AtsReportResult
  /** Where the next step is fixing the CV, the points come before the scores. */
  findingsFirst?: boolean
}) {
  const findings = sortFindings(result.findings)

  return (
    <div className="grid gap-4 @4xl/main:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle aria-level={2} role="heading">
            Critère par critère
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            {result.dimensions.map((dimension) => (
              <div key={dimension.key}>
                <div className="flex justify-between gap-4 text-sm">
                  <dt>
                    {ATS_DIMENSION_LABELS[dimension.key] ?? dimension.key}
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {dimension.status === "scored" && dimension.score !== null
                      ? `${dimension.score} / 100`
                      : "Non évalué"}
                  </dd>
                </div>
                {dimension.status === "scored" && dimension.score !== null ? (
                  <div
                    aria-hidden="true"
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.max(0, Math.min(100, dimension.score))}%`,
                      }}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card className={cn(findingsFirst && "order-first")}>
        <CardHeader>
          <CardTitle aria-level={2} role="heading">
            Points relevés
          </CardTitle>
        </CardHeader>
        <CardContent>
          {findings.length > 0 ? (
            <ul className="space-y-2">
              {findings.map((finding) => {
                const Icon = SEVERITY_ICON[finding.severity]

                return (
                  <li
                    className="flex items-start gap-2.5 rounded-lg bg-muted/40 px-3 py-2 text-sm"
                    key={finding.code}
                  >
                    <Icon
                      aria-hidden="true"
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        SEVERITY_TEXT[finding.severity]
                      )}
                    />
                    <span>
                      <span className="font-medium">
                        {ATS_SEVERITY_LABELS[finding.severity]} :
                      </span>{" "}
                      {ATS_FINDING_LABELS[finding.code] ?? finding.code}
                      {ATS_FINDING_FIXES[finding.code] ? (
                        <span className="mt-0.5 block text-muted-foreground">
                          {ATS_FINDING_FIXES[finding.code]}
                        </span>
                      ) : null}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun point à corriger n’a été relevé.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
