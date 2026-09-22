import { CV_ACCEPT, MAX_CV_BYTES, isAtsApiError } from "@/lib/ats-api"
import type { LandingDictionary } from "@/content/types"

export type ScanRejection = "tooLarge" | "wrongType"

const PDF_EXTENSION = /\.pdf$/i
const DOCX_EXTENSION = /\.docx$/i

/**
 * Why a file cannot even be sent, or null when it can.
 *
 * Checked in the browser so an obviously doomed upload never costs the visitor
 * a round trip — the API validates the same things again on the bytes it
 * receives, which is what actually enforces them.
 */
export function cvRejectionReason(file: File): ScanRejection | null {
  if (file.size > MAX_CV_BYTES) return "tooLarge"

  const named = PDF_EXTENSION.test(file.name) || DOCX_EXTENSION.test(file.name)

  return named ? null : "wrongType"
}

export { CV_ACCEPT, MAX_CV_BYTES }

/**
 * Turns a failed response into wording the visitor can act on.
 *
 * The API's own message is preferred when it sent one: it is already localised
 * and says precisely what happened. The status-based fallbacks exist for the
 * cases where the failure never reached the API at all.
 */
export function scanErrorMessage(
  error: unknown,
  dictionary: LandingDictionary["ats"],
): string {
  if (!isAtsApiError(error)) return dictionary.errors.network

  if (error.message) return error.message

  switch (error.status) {
    case 410:
      return dictionary.errors.expired
    case 413:
      return dictionary.upload.tooLarge
    case 429:
      return dictionary.errors.tooManyRequests
    case 503:
      return dictionary.errors.unavailable
    case 502:
      return dictionary.errors.network
    default:
      return dictionary.errors.generic
  }
}

/** POSTs to the landing's own BFF, never to the API directly (CORS). */
export async function postScan(file: File, offerText: string | null) {
  const body = new FormData()

  body.append("cvFile", file)

  if (offerText) {
    body.append("offerText", offerText)
  }

  return request("/api/ats-scan", { body, method: "POST" })
}

export async function postUnlock(
  scanId: string,
  email: string,
  consentAccepted: boolean,
) {
  return request(`/api/ats-scan/${encodeURIComponent(scanId)}/unlock`, {
    body: JSON.stringify({ consentAccepted, email }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })
}

async function request(url: string, init: RequestInit) {
  let response: Response

  try {
    response = await fetch(url, init)
  } catch {
    // Offline, or the route never answered: not something the API said.
    throw { message: null, status: 0 }
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw {
      message:
        payload && typeof payload === "object" && "message" in payload
          ? ((payload as { message?: string }).message ?? null)
          : null,
      status: response.status,
    }
  }

  return payload as unknown
}
