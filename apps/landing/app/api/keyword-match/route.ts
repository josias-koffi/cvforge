import { keywordMatchEndpoint } from "@/lib/ats-api"
import { relayUpload } from "@/lib/bff"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
/** Parsing a PDF takes a few seconds on a large file; no model is called. */
export const maxDuration = 30

/** The free CV ↔ offer comparator, relayed to the API (US-136). */
export function POST(request: Request) {
  return relayUpload(request, keywordMatchEndpoint())
}
