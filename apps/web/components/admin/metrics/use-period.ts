"use client"

import { useSearchParams } from "next/navigation"

import { parsePeriod, PERIOD_PARAM } from "@/lib/admin-metrics/period"

/**
 * The period in the URL, for the client parts of the cockpit layout: a layout
 * gets no `searchParams`, so the tabs, the switch and the export link read it
 * here. Callers sit under a Suspense boundary.
 */
export function usePeriod() {
  return parsePeriod(useSearchParams().get(PERIOD_PARAM))
}
