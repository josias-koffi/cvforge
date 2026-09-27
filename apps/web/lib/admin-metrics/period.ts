import {
  DEFAULT_METRICS_PERIOD,
  isMetricsPeriod,
  metricsPeriods,
  type MetricsPeriod,
} from "@cvforge/types"

/**
 * The cockpit's period lives in the URL, in French like every other query
 * string the admin reads, and is translated to the API's `period` only when
 * fetching. A shared link or a reload lands on the same figures.
 */
export const PERIOD_PARAM = "periode"

/** Short labels for the period switch. */
export const periodLabels: Record<MetricsPeriod, string> = {
  "7": "7 j",
  "30": "30 j",
  "90": "90 j",
  "365": "12 mois",
  all: "Tout",
}

/** How a period reads inside a sentence: "CA sur 30 jours". */
export const periodPhrases: Record<MetricsPeriod, string> = {
  "7": "sur 7 jours",
  "30": "sur 30 jours",
  "90": "sur 90 jours",
  "365": "sur 12 mois",
  all: "depuis le lancement",
}

/** Every period, in the order the switch shows them. */
export const PERIODS: readonly MetricsPeriod[] = metricsPeriods

/**
 * The period a raw query value asks for. Anything unknown — a typo, a
 * repeated param, an old bookmark — falls back to the default rather than
 * erroring: a cockpit that 404s on a bad link is worse than one showing 30 days.
 */
export function parsePeriod(
  value: string | string[] | null | undefined
): MetricsPeriod {
  const raw = Array.isArray(value) ? value[0] : value

  return isMetricsPeriod(raw) ? raw : DEFAULT_METRICS_PERIOD
}

/**
 * A cockpit link that keeps the period. The default is left out so the plain
 * `/admin/metrics` stays the canonical URL.
 */
export function withPeriod(href: string, period: MetricsPeriod) {
  if (period === DEFAULT_METRICS_PERIOD) return href

  const separator = href.includes("?") ? "&" : "?"

  return `${href}${separator}${PERIOD_PARAM}=${period}`
}
