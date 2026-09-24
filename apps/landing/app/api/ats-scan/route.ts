import { scanEndpoint } from "@/lib/ats-api"
import { relayUpload } from "@/lib/bff"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
/** The API parses a PDF and calls a model; the default 15s is too tight. */
export const maxDuration = 30

/** The free ATS scan, relayed to the API (see `lib/bff`). */
export function POST(request: Request) {
  return relayUpload(request, scanEndpoint())
}
