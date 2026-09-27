import type { Kpi } from "@cvforge/types"
import {
  ArrowDownRightIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { deltaPercent, formatDelta } from "@/lib/admin-metrics/format"

/**
 * The change of a figure against the period before. Hidden when there is no
 * previous period to compare with (the whole history, or a zero before):
 * a badge saying "new" on every figure would be noise.
 *
 * `upIsBad` flips the colour for figures where growth hurts — AI cost, error
 * rate — so green always means "good for the business".
 */
export function DeltaBadge({
  kpi,
  upIsBad = false,
}: {
  kpi: Kpi
  upIsBad?: boolean
}) {
  const delta = deltaPercent(kpi)
  if (delta === null) return null

  const rounded = Math.round(delta)
  const flat = rounded === 0
  const good = upIsBad ? rounded < 0 : rounded > 0
  const Icon = flat
    ? ArrowRightIcon
    : rounded > 0
      ? ArrowUpRightIcon
      : ArrowDownRightIcon

  return (
    <Badge variant={flat ? "outline" : good ? "success" : "destructive"}>
      <Icon aria-hidden />
      {formatDelta(delta)}
      <span className="sr-only"> par rapport à la période précédente</span>
    </Badge>
  )
}
