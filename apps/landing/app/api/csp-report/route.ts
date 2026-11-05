const MAX_BODY_BYTES = 8 * 1024
const MAX_LOGS_PER_MINUTE = 120

let windowStart = 0
let logged = 0

/** Keeps a flood of reports from becoming a flood of log lines. */
function withinBudget(now: number) {
  if (now - windowStart > 60_000) {
    windowStart = now
    logged = 0
  }

  logged += 1

  return logged <= MAX_LOGS_PER_MINUTE
}

/**
 * Receives Content-Security-Policy violation reports and writes one line per
 * report to the server log. Unauthenticated by necessity (browsers send these
 * without cookies), so it trusts nothing: bounded size, bounded rate, nothing
 * stored, always 204.
 */
export async function POST(request: Request) {
  const body = (await request.text().catch(() => "")).slice(0, MAX_BODY_BYTES)

  if (body && withinBudget(Date.now())) {
    console.warn(`[csp-report] ${body.replace(/\s+/g, " ")}`)
  }

  return new Response(null, { status: 204 })
}
