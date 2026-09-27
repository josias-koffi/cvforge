import { forwardedFor } from "@/lib/forwarded-for"
import { apiUrl } from "@/lib/offers-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** A tool, a step and a locale: anything longer is not one of our events. */
const MAX_EVENT_BYTES = 512

export function eventsEndpoint(env: NodeJS.ProcessEnv = process.env) {
  return `${apiUrl(env)}/public/events`
}

/**
 * Relays a funnel event to the API, for the same reason as the scan route:
 * the API's CORS policy only admits the app. The API checks the values; this
 * only refuses what is obviously not an event before carrying it further.
 */
export async function POST(request: Request) {
  const body = await request.text().catch(() => "")

  if (!body || body.length > MAX_EVENT_BYTES) {
    return new Response(null, { status: 400 })
  }

  try {
    const response = await fetch(eventsEndpoint(), {
      body,
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...forwardedFor(request) },
      method: "POST",
    })

    return new Response(null, { status: response.ok ? 204 : response.status })
  } catch {
    return new Response(null, { status: 502 })
  }
}
