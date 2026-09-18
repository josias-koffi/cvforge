import { NextResponse, type NextRequest } from "next/server"

import { apiRequest } from "@/lib/api"
import { requireAdminSession } from "@/lib/session"

/** Streams the metrics CSV from the API with the admin's session cookie. */
export async function GET(request: NextRequest) {
  await requireAdminSession()

  const response = await apiRequest("/admin/metrics/export.csv")

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
      "content-type": response.headers.get("content-type") ?? "text/csv; charset=utf-8",
    },
  })
}
