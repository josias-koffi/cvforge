import { aiFeatures, type AiCostMetrics, type AiFeature } from "@cvforge/types"

import { aiFeatureLabels } from "@/lib/admin-metrics/labels"

/** The chart palette has five colours; past that, stacks stop being readable. */
export const MAX_CHARTED_FEATURES = 5
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const
/** Key of the merged tail when more features than colours are present. */
export const REST_KEY = "rest"
const USD_PRECISION = 10_000

export type FeatureCostChart = {
  config: Record<string, { color: string; label: string }>
  data: Array<Record<string, number | string>>
  keys: string[]
}

/**
 * The per-feature cost series, ready to stack: only the features present,
 * the costliest first, and the tail merged into "Autres usages" when there
 * are more features than colours — thirteen shades of blue say nothing.
 */
export function featureCostChart(
  series: AiCostMetrics["series"]
): FeatureCostChart {
  const totals = new Map<AiFeature, number>()

  for (const point of series) {
    for (const feature of aiFeatures) {
      const cost = point[feature]
      if (typeof cost === "number")
        totals.set(feature, (totals.get(feature) ?? 0) + cost)
    }
  }

  const ranked = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([feature]) => feature)
  const overflow = ranked.length > MAX_CHARTED_FEATURES
  const kept = overflow ? ranked.slice(0, MAX_CHARTED_FEATURES - 1) : ranked
  const merged = overflow ? ranked.slice(MAX_CHARTED_FEATURES - 1) : []
  const keys: string[] = overflow ? [...kept, REST_KEY] : kept

  const config = Object.fromEntries(
    keys.map((key, index) => [
      key,
      {
        color: CHART_COLORS[index % CHART_COLORS.length]!,
        label:
          key === REST_KEY
            ? "Autres usages"
            : aiFeatureLabels[key as AiFeature],
      },
    ])
  )

  const data = series.map((point) => {
    const row: Record<string, number | string> = { date: point.date }
    for (const feature of kept) row[feature] = roundUsd(point[feature] ?? 0)
    if (overflow) {
      row[REST_KEY] = roundUsd(
        merged.reduce((sum, feature) => sum + (point[feature] ?? 0), 0)
      )
    }
    return row
  })

  return { config, data, keys }
}

/** Four decimals: the tooltip prints the raw value, float noise included. */
function roundUsd(value: number) {
  return Math.round(value * USD_PRECISION) / USD_PRECISION
}
