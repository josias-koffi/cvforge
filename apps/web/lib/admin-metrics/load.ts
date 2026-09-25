import { api } from "@/lib/api"
import { parsePeriod, PERIOD_PARAM } from "@/lib/admin-metrics/period"
import { requireAdminSession } from "@/lib/session"

/** The cockpit endpoints, one per tab. */
export type MetricsEndpoint =
  "overview" | "revenue" | "ai-costs" | "usage" | "market" | "acquisition"

type SearchParams = Record<string, string | string[] | undefined>

/**
 * One tab's figures for the period in the URL. The guard is repeated here
 * although the layout has it: a layout does not re-run when the admin moves
 * between tabs, a page does.
 */
export async function loadMetrics<T>(
  endpoint: MetricsEndpoint,
  searchParams: Promise<SearchParams>
) {
  await requireAdminSession()

  const period = parsePeriod((await searchParams)[PERIOD_PARAM])

  return api<T>(`/admin/metrics/${endpoint}`, { query: { period } })
}
