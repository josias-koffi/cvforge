import { NextResponse } from "next/server"

import { readErrorMessage, unlockEndpoint } from "@/lib/ats-api"
import { forwardedFor } from "../../route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Trades the visitor's email for the full report. The API returns it in the
 * response and sends a magic link alongside, so nothing here has to wait on
 * mail delivery.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ scanId: string }> },
) {
  const { scanId } = await params

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: null }, { status: 400 })
  }

  try {
    const response = await fetch(unlockEndpoint(scanId), {
      body: JSON.stringify(body),
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...forwardedFor(request) },
      method: "POST",
    })

    if (!response.ok) {
      return NextResponse.json(
        { message: await readErrorMessage(response) },
        { status: response.status },
      )
    }

    return NextResponse.json(await response.json())
  } catch {
    return NextResponse.json({ message: null }, { status: 502 })
  }
}
