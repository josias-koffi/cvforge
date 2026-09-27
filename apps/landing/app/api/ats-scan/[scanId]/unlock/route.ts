import { unlockEndpoint } from "@/lib/ats-api"
import { relayJson } from "@/lib/bff"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Trades the visitor's email for the full report. The API returns it in the
 * response and sends a magic link alongside, so nothing here has to wait on
 * mail delivery.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await params

  return relayJson(request, unlockEndpoint(scanId))
}
