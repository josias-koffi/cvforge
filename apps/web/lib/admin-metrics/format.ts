import type { Kpi, MetricsBucket, Rate } from "@cvforge/types"

import { formatPrice } from "@/lib/format"

/** Placeholder for a figure that cannot be computed, never a misleading 0. */
export const NO_VALUE = "—"

const CENTS_PER_UNIT = 100
const PERCENT = 100
/** Below one dollar, two decimals would round most AI calls to "0,00 $". */
const SMALL_USD_THRESHOLD = 1
const SMALL_USD_DECIMALS = 4

const countFormatter = new Intl.NumberFormat("fr-FR")
const compactFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
  notation: "compact",
})
const rateFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
})

/** "1 234" — French thousands separator. */
export function formatCount(value: number) {
  return countFormatter.format(value)
}

/** "12,3 k" for axis-sized labels. */
export function formatCompact(value: number) {
  return compactFormatter.format(value)
}

/** EUR cents as "12,34 €". */
export function formatEurCents(cents: number | null) {
  return cents === null ? NO_VALUE : formatPrice(cents)
}

/**
 * OpenRouter bills in USD, often fractions of a cent per call: amounts under
 * a dollar keep up to four decimals so a call's cost is not rounded to zero.
 */
export function formatUsd(value: number | null) {
  if (value === null) return NO_VALUE

  const small = Math.abs(value) < SMALL_USD_THRESHOLD && value !== 0

  return new Intl.NumberFormat("fr-FR", {
    currency: "USD",
    maximumFractionDigits: small ? SMALL_USD_DECIMALS : 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value)
}

/** A USD amount in EUR cents, at the API's fixed conversion rate. */
export function usdToEurCents(usd: number, usdToEurRate: number) {
  return Math.round(usd * usdToEurRate * CENTS_PER_UNIT)
}

/** EUR cents as euros, for charts whose tooltip prints the raw value. */
export function centsToUnits(cents: number) {
  return Math.round(cents) / CENTS_PER_UNIT
}

/** A percent (0–100) as "12,5 %", or "—" when there was nothing to divide. */
export function formatRate(rate: Rate) {
  return rate === null ? NO_VALUE : `${rateFormatter.format(rate)} %`
}

/** `part` over `whole` in percent, null on an empty whole. */
export function ratio(part: number, whole: number): Rate {
  return whole > 0 ? (part / whole) * PERCENT : null
}

/**
 * Change against the previous period, in percent. Null when there is no
 * previous period or it was zero: "+∞ %" says nothing a reader can use.
 */
export function deltaPercent({ previous, value }: Kpi): number | null {
  if (previous === null || previous === 0) return null

  return ((value - previous) / Math.abs(previous)) * PERCENT
}

/** "+12 %", "−5 %", "0 %": rounded, with a real minus sign. */
export function formatDelta(delta: number) {
  const rounded = Math.round(delta)
  if (rounded === 0) return "0 %"

  const sign = rounded > 0 ? "+" : "−"

  return `${sign}${countFormatter.format(Math.abs(rounded))} %`
}

/** "3 min 20 s" from milliseconds, for AI call durations. */
export function formatDurationMs(ms: number) {
  const seconds = ms / 1000
  if (seconds < 60) return `${rateFormatter.format(seconds)} s`

  const minutes = Math.floor(seconds / 60)

  return `${minutes} min ${Math.round(seconds % 60)} s`
}

/** "12 min" from minutes, or "—". */
export function formatMinutes(minutes: number | null) {
  return minutes === null ? NO_VALUE : `${rateFormatter.format(minutes)} min`
}

/** Days, e.g. "3 j", or "—". */
export function formatDays(days: number | null) {
  return days === null ? NO_VALUE : `${rateFormatter.format(days)} j`
}

/*
 * Buckets are ISO dates the API cut in UTC: formatting in the browser's zone
 * would shift a day-bucket to the day before west of Greenwich.
 */
const dayFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
})
const monthFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  timeZone: "UTC",
  year: "numeric",
})
const longDayFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
})
const longMonthFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
})

/** Axis label of a bucket: "25 sept.", "sem. du 22 sept.", "sept. 2026". */
export function formatBucket(date: string, bucket: MetricsBucket) {
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return date

  if (bucket === "month") return monthFormatter.format(value)
  if (bucket === "week") return `sem. du ${dayFormatter.format(value)}`

  return dayFormatter.format(value)
}

/** Tooltip label of a bucket, spelled out. */
export function formatBucketLong(date: string, bucket: MetricsBucket) {
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return date

  if (bucket === "month") return longMonthFormatter.format(value)
  if (bucket === "week") return `Semaine du ${longDayFormatter.format(value)}`

  return longDayFormatter.format(value)
}

/** Sum of one key over a series, for the text under a chart. */
export function sumOf<T extends Record<string, unknown>>(
  rows: readonly T[],
  key: string
) {
  return rows.reduce((total, row) => {
    const value = row[key]

    return total + (typeof value === "number" ? value : 0)
  }, 0)
}
