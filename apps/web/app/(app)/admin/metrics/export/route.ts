import { NextResponse, type NextRequest } from "next/server"

import { parsePeriod, PERIOD_PARAM } from "@/lib/admin-metrics/period"
import { apiRequest } from "@/lib/api"
import { requireAdminSession } from "@/lib/session"

/**
 * Streams the metrics CSV from the API with the admin's session cookie, for
 * the period on screen: the cockpit's `periode` becomes the API's `period`.
 */
export async function GET(request: NextRequest) {
  await requireAdminSession()

  const period = parsePeriod(request.nextUrl.searchParams.get(PERIOD_PARAM))
  const response = await apiRequest("/admin/metrics/export.csv", {
    query: { period },
  })

  if (!response.ok || !response.body) {
    return NextResponse.redirect(
      new URL("/admin/metrics?notice=export-failed", request.url)
    )
  }

  return new NextResponse(response.body, {
    headers: {
      "content-disposition":
        response.headers.get("content-disposition") ??
        'attachment; filename="cvforge-metrics.csv"',
      "content-type":
        response.headers.get("content-type") ?? "text/csv; charset=utf-8",
    },
  })
}
