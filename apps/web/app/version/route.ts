import { NextResponse } from "next/server"

/** Set from the image tag at deploy time; empty when running from source. */
const VERSION = process.env.APP_VERSION?.trim() ?? ""

/**
 * Which build is actually serving. Public and unauthenticated on purpose: the
 * deploy smoke test calls it before anyone has a session, and it discloses
 * nothing but the image tag we just published ourselves.
 *
 * It exists because checking that `/login` returns 200 proves the app is up,
 * not that it is the app we just deployed — a stale container answers that
 * check perfectly.
 */
export function GET() {
  return NextResponse.json(
    { service: "web", status: "ok", version: VERSION },
    { headers: { "cache-control": "no-store" } }
  )
}
