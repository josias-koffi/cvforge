import { isPublicErrorCode, type PublicErrorCode } from "@cvforge/types"
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
 * Anything the caller can act on: the status, and the code the API named the
 * refusal with. Never the API's message, which is French whatever the page's
 * language: the landing words every code itself (US-134).
 */
export type AtsApiError = {
  status: number
  code: PublicErrorCode | null
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

/** The free CV ↔ offer comparator (US-136). */
export function keywordMatchEndpoint(env: NodeJS.ProcessEnv = process.env) {
  return `${apiUrl(env)}/public/keyword-match`
}

export function keywordMatchLeadEndpoint(env: NodeJS.ProcessEnv = process.env) {
  return `${keywordMatchEndpoint(env)}/lead`
}

/** The job market tool (US-137): its figures, its autocomplete, its lead. */
export function jobMarketEndpoint(env: NodeJS.ProcessEnv = process.env) {
  return `${apiUrl(env)}/public/job-market`
}

/** The employer check (US-139): its search, its records, its lead. */
export function companyCheckEndpoint(env: NodeJS.ProcessEnv = process.env) {
  return `${apiUrl(env)}/public/company-check`
}

/** The likely interview questions (US-141): its questions, its lead. */
export function interviewQuestionsEndpoint(
  env: NodeJS.ProcessEnv = process.env
) {
  return `${apiUrl(env)}/public/interview-questions`
}

export function unlockEndpoint(
  scanId: string,
  env: NodeJS.ProcessEnv = process.env
) {
  return `${scanEndpoint(env)}/${encodeURIComponent(scanId)}/unlock`
}

/**
 * Reads the code of the API's error body without assuming it is JSON: a 502
 * from the proxy in front of it is HTML, and blowing up on that would replace
 * a useful status with a parse error. An unknown code reads as none.
 */
export async function readErrorCode(
  response: Response
): Promise<PublicErrorCode | null> {
  try {
    const payload = (await response.json()) as { code?: unknown }

    return isPublicErrorCode(payload.code) ? payload.code : null
  } catch {
    return null
  }
}
