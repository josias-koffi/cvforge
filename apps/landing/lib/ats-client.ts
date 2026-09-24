import { isPublicErrorCode, type PublicErrorCode } from "@cvforge/types"

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
 * The page's own wording for each refusal the API names (US-134). Shared by
 * every free tool: the comparator's refusals are the scan's, plus the offer's.
 */
function codeMessage(
  code: PublicErrorCode,
  dictionary: LandingDictionary["ats"]
): string {
  const messages: Record<PublicErrorCode, string> = {
    BUDGET_EXHAUSTED: dictionary.errors.unavailable,
    CONSENT_REQUIRED: dictionary.errors.consentRequired,
    CV_FILE_REQUIRED: dictionary.errors.fileRequired,
    CV_FILE_TOO_LARGE: dictionary.upload.tooLarge,
    CV_FILE_UNSUPPORTED: dictionary.upload.wrongType,
    CV_NOT_ENOUGH_TEXT: dictionary.errors.notEnoughText,
    INVALID_EMAIL: dictionary.errors.invalidEmail,
    OFFER_NOT_USABLE: dictionary.errors.offerNotUsable,
    OFFER_TEXT_REQUIRED: dictionary.errors.offerRequired,
    RATE_LIMITED: dictionary.errors.tooManyRequests,
    SCAN_EXPIRED: dictionary.errors.expired,
    SCAN_NOT_FOUND: dictionary.errors.notFound,
  }

  return messages[code]
}

/**
 * Turns a failed response into wording the visitor can act on, in the page's
 * language: from the code the API named the refusal with, else from the
 * status, for the failures that never reached the API at all.
 */
export function scanErrorMessage(
  error: unknown,
  dictionary: LandingDictionary["ats"]
): string {
  if (!isAtsApiError(error)) return dictionary.errors.network

  if (error.code) return codeMessage(error.code, dictionary)

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
export async function postScan(
  file: File,
  offerText: string | null,
  locale: string
) {
  const body = new FormData()

  body.append("cvFile", file)
  // The scan is stored in the page's language, not always French (US-134).
  body.append("locale", locale)

  if (offerText) {
    body.append("offerText", offerText)
  }

  return callBff("/api/ats-scan", { body, method: "POST" })
}

export async function postUnlock(
  scanId: string,
  email: string,
  consentAccepted: boolean
) {
  return callBff(`/api/ats-scan/${encodeURIComponent(scanId)}/unlock`, {
    body: JSON.stringify({ consentAccepted, email }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })
}

/**
 * POSTs to one of the landing's own routes. Throws `{ code, status }` on any
 * failure, which `scanErrorMessage` words; `status` 0 means it never answered.
 */
export async function callBff(url: string, init: RequestInit) {
  let response: Response

  try {
    response = await fetch(url, init)
  } catch {
    // Offline, or the route never answered: not something the API said.
    throw { code: null, status: 0 }
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw {
      code: readCode((payload as { code?: unknown } | null)?.code),
      status: response.status,
    }
  }

  return payload as unknown
}

function readCode(value: unknown): PublicErrorCode | null {
  return isPublicErrorCode(value) ? value : null
}
