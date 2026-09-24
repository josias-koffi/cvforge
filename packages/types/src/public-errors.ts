/**
 * Why a public route refused a request, as a code the landing translates
 * (US-134). The API's own message stays French and is for logs and direct
 * callers; a visitor only ever reads the landing's wording for the code.
 */
export const publicErrorCodes = [
  "CV_FILE_REQUIRED",
  "CV_FILE_TOO_LARGE",
  "CV_FILE_UNSUPPORTED",
  "CV_NOT_ENOUGH_TEXT",
  "OFFER_TEXT_REQUIRED",
  "OFFER_NOT_USABLE",
  "INVALID_EMAIL",
  "CONSENT_REQUIRED",
  "SCAN_NOT_FOUND",
  "SCAN_EXPIRED",
  "RATE_LIMITED",
  "BUDGET_EXHAUSTED",
  "ROME_APPELLATION_UNKNOWN",
  "DEPARTMENT_UNKNOWN",
] as const;
export type PublicErrorCode = (typeof publicErrorCodes)[number];

export function isPublicErrorCode(value: unknown): value is PublicErrorCode {
  return (publicErrorCodes as readonly unknown[]).includes(value);
}

/** The body of a refusal on a public route: `{ code, message }`. */
export function publicError(code: PublicErrorCode, message: string) {
  return { code, message };
}
