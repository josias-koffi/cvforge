import { NextResponse } from "next/server"

import {
  MAX_CV_BYTES,
  readErrorMessage,
  scanEndpoint,
} from "@/lib/ats-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
/** The API parses a PDF and calls a model; the default 15s is too tight. */
export const maxDuration = 30

/**
 * The landing's first API route, and the reason it exists: the API's CORS
 * allowance is deliberately limited to the app's origin, and widening a
 * credentialed policy to let a public page post directly would be a security
 * regression. The browser talks to this route, this route talks to the API
 * server-side over `API_INTERNAL_URL`.
 */
export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0)

  // Cheap refusal before buffering: the API enforces the same cap on the bytes
  // it actually receives, this only avoids carrying them across the network.
  if (contentLength > MAX_CV_BYTES) {
    return NextResponse.json(
      { message: null },
      { status: 413 },
    )
  }

  let body: FormData

  try {
    body = await request.formData()
  } catch {
    return NextResponse.json({ message: null }, { status: 400 })
  }

  try {
    const response = await fetch(scanEndpoint(), {
      body,
      cache: "no-store",
      headers: forwardedFor(request),
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
    // The API is unreachable; the page says so rather than showing a score
    // it does not have.
    return NextResponse.json({ message: null }, { status: 502 })
  }
}

/**
 * The visitor's address, forwarded deliberately: the API rate-limits the scan
 * per IP, and without this every visitor would arrive as this server and share
 * a single bucket.
 */
export function forwardedFor(request: Request): Record<string, string> {
  const forwarded = request.headers.get("x-forwarded-for")
  const real = request.headers.get("x-real-ip")
  const client = forwarded?.split(",")[0]?.trim() || real?.trim()

  return client ? { "x-forwarded-for": client, "x-real-ip": client } : {}
}
