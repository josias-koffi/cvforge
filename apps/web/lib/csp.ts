/**
 * The app's Content-Security-Policy, shipped as Report-Only first: violations
 * are logged at /api/csp-report, nothing is blocked. Once a few days of real
 * traffic report nothing unexpected, the same string goes out as
 * `Content-Security-Policy`.
 *
 * Scripts are nonce-based (`strict-dynamic`), which is what makes this worth
 * having: an injected <script> without the nonce does not run. Styles keep
 * 'unsafe-inline' because component libraries set `style=""` attributes, which
 * a nonce cannot cover; styles cannot execute code, so this is the usual trade.
 */
export const CSP_REPORT_PATH = "/api/csp-report"

export function buildCsp(nonce: string, isDev = process.env.NODE_ENV === "development") {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // The app only talks to its own origin: /api/* is proxied to the API.
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    "media-src 'self' blob:",
    "frame-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `report-uri ${CSP_REPORT_PATH}`,
  ].join("; ")
}

export function newNonce() {
  return Buffer.from(crypto.randomUUID()).toString("base64")
}
