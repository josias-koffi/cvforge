import { NextResponse } from "next/server"

import { MAX_CV_BYTES, readErrorCode } from "@/lib/ats-api"
import { forwardedFor } from "@/lib/forwarded-for"

/**
 * The landing's routes towards the API's public tools. The browser talks to
 * these, never to the API: its CORS allowance is limited to the app's origin,
 * and widening a credentialed policy for a public page would be a security
 * regression. The visitor's address travels with the call (`forwardedFor`),
 * since the API meters per address.
 *
 * Every refusal comes back as `{ code }` with the API's status, never with its
 * message, which is French whatever the page's language (US-134).
 */

/** A CV upload, relayed as the multipart body it arrived as. */
export async function relayUpload(request: Request, endpoint: string) {
  const contentLength = Number(request.headers.get("content-length") ?? 0)

  // Cheap refusal before buffering: the API enforces the same cap on the bytes
  // it actually receives, this only avoids carrying them across the network.
  if (contentLength > MAX_CV_BYTES) {
    return NextResponse.json({ code: null }, { status: 413 })
  }

  let body: FormData

  try {
    body = await request.formData()
  } catch {
    return NextResponse.json({ code: null }, { status: 400 })
  }

  return relay(endpoint, { body, headers: forwardedFor(request) })
}

/** A JSON body (an email and its consent, say), relayed as JSON. */
export async function relayJson(request: Request, endpoint: string) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ code: null }, { status: 400 })
  }

  return relay(endpoint, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...forwardedFor(request) },
  })
}

async function relay(
  endpoint: string,
  init: { body: BodyInit; headers: Record<string, string> }
) {
  try {
    const response = await fetch(endpoint, {
      ...init,
      cache: "no-store",
      method: "POST",
    })

    if (!response.ok) {
      return NextResponse.json(
        { code: await readErrorCode(response) },
        { status: response.status }
      )
    }

    return NextResponse.json(await response.json(), {
      status: response.status,
    })
  } catch {
    // The API is unreachable; the page says so rather than inventing a result.
    return NextResponse.json({ code: null }, { status: 502 })
  }
}
