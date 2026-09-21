import { NextResponse } from "next/server"

import { apiRequest } from "@/lib/api"

export const dynamic = "force-dynamic"

/**
 * Hands the candidate their own data as a file. A route handler rather than a
 * server action: the browser must receive a download, and the session cookie
 * is httpOnly, so it cannot call the API itself.
 */
export async function GET() {
  const response = await apiRequest("/privacy/export")

  if (!response.ok) {
    return NextResponse.json(
      { message: "L'export n'a pas pu être généré." },
      { status: response.status }
    )
  }

  const payload = await response.text()
  const day = new Date().toISOString().slice(0, 10)

  return new NextResponse(payload, {
    headers: {
      "content-disposition": `attachment; filename="cvspark-donnees-${day}.json"`,
      "content-type": "application/json; charset=utf-8",
    },
  })
}
