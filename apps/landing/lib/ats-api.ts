import { apiUrl } from "@/lib/offers-api"

/** Mirrors the API's `PublicAtsScanResponse`; the free tier carries no dimensions. */
export type AtsScanResult = {
  scanId: string
  overallScore: number
  band: "weak" | "fair" | "good" | "excellent"
  highlights: string[]
  scoredDimensionCount: number
  lockedFindingCount: number
  partial: boolean
  expiresAt: string
}

export type AtsDimension = {
  key: string
  status: "scored" | "unavailable"
  score: number | null
  unavailableReason?: string
}

export type AtsFinding = {
  code: string
  severity: "critical" | "warning" | "info"
  dimension: string
}

export type AtsUnlockResult = {
  scanId: string
  result: {
    overallScore: number
    band: AtsScanResult["band"]
    dimensions: AtsDimension[]
    findings: AtsFinding[]
    llmApplied: boolean
    engineVersion: string
  }
  magicLinkSent: boolean
}

/**
 * Anything the caller can act on. The API's own message is passed through when
 * it has one: it already speaks the visitor's language and says what happened
 * (file too large, budget exhausted, scan expired).
 */
export type AtsApiError = {
  status: number
  message: string | null
}

export function isAtsApiError(value: unknown): value is AtsApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    typeof (value as AtsApiError).status === "number"
  )
}

/** The API rejects an upload larger than this before reading it. */
export const MAX_CV_BYTES = 5 * 1024 * 1024
export const CV_ACCEPT = ".pdf,.docx,application/pdf"

export function scanEndpoint(env: NodeJS.ProcessEnv = process.env) {
  return `${apiUrl(env)}/public/ats-scan`
}

export function unlockEndpoint(
  scanId: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  return `${scanEndpoint(env)}/${encodeURIComponent(scanId)}/unlock`
}

/**
 * Reads the API's error body without assuming it is JSON: a 502 from the proxy
 * in front of it is HTML, and blowing up on that would replace a useful status
 * with a parse error.
 */
export async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { message?: unknown }

    return typeof payload.message === "string" ? payload.message : null
  } catch {
    return null
  }
}
