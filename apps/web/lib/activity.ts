import type { DraftApplication } from "@cvforge/types"

import type { ActivityPoint } from "@/components/dashboard/activity-chart"

const DAY_MS = 24 * 60 * 60 * 1000

function dayKey(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10)
}

/** Builds one point per day over the last `days` days, oldest first. */
export function buildActivitySeries(
  offers: DraftApplication[],
  days = 90,
  now = new Date()
): ActivityPoint[] {
  const points = new Map<string, ActivityPoint>()

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = dayKey(new Date(now.getTime() - offset * DAY_MS))
    points.set(date, { date, documents: 0, imported: 0 })
  }

  for (const offer of offers) {
    const imported = points.get(dayKey(offer.createdAt))
    if (imported) imported.imported += 1

    for (const generatedAt of [offer.cvGeneratedAt, offer.letterGeneratedAt]) {
      const point = generatedAt ? points.get(dayKey(generatedAt)) : undefined
      if (point) point.documents += 1
    }
  }

  return [...points.values()]
}
