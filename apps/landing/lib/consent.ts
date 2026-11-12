/**
 * The visitor's answer to the cookie banner, kept in a first-party cookie.
 *
 * CNIL: the answer is asked again after six months, refusing is as easy as
 * accepting, and a refusal removes what Google Analytics had already set.
 * Storing the answer itself needs no consent (it is strictly necessary).
 */

export type ConsentChoice = "granted" | "denied"

export const CONSENT_COOKIE = "jobspark_consent"
/** Six months, the CNIL's guidance for keeping a choice before asking again. */
export const CONSENT_MAX_AGE_SECONDS = 182 * 24 * 60 * 60
/** Dispatched on `window` by "manage cookies" links to open the banner again. */
export const OPEN_CONSENT_EVENT = "jobspark:open-cookie-consent"

// Bumped when the purposes change: every visitor is then asked again.
const VERSION = "v1"

function cookieValue(cookieHeader: string, name: string) {
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=")
    if (key === name) return rest.join("=")
  }
  return null
}

/** The stored choice, or null when the visitor has not answered (or answered an older banner). */
export function parseConsent(cookieHeader: string): ConsentChoice | null {
  const value = cookieValue(cookieHeader, CONSENT_COOKIE)
  if (value === `${VERSION}.granted`) return "granted"
  if (value === `${VERSION}.denied`) return "denied"
  return null
}

export function consentCookie(choice: ConsentChoice, secure: boolean) {
  return [
    `${CONSENT_COOKIE}=${VERSION}.${choice}`,
    `Max-Age=${CONSENT_MAX_AGE_SECONDS}`,
    "Path=/",
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ")
}

/** `_ga` and `_ga_<stream>`: the cookies Google Analytics 4 sets. */
export function analyticsCookieNames(cookieHeader: string) {
  return cookieHeader
    .split(";")
    .map((part) => part.trim().split("=")[0])
    .filter((name) => name === "_ga" || name.startsWith("_ga_"))
}

/**
 * Every domain a cookie of this page may have been set on: GA writes on the
 * widest one it can (koklo.dev for jobspark.koklo.dev), a cookie can only be
 * removed on the exact domain it was set on.
 */
export function cookieDomains(hostname: string) {
  const labels = hostname.split(".")
  if (labels.length < 2 || /^[\d.]+$/.test(hostname)) return [hostname]
  return labels.slice(0, -1).map((_, i) => labels.slice(i).join("."))
}

/** The `document.cookie` writes that remove the GA cookies of this page. */
export function analyticsCookieRemovals(
  cookieHeader: string,
  hostname: string
) {
  return analyticsCookieNames(cookieHeader).flatMap((name) => [
    `${name}=; Max-Age=0; Path=/`,
    ...cookieDomains(hostname).map(
      (domain) => `${name}=; Max-Age=0; Path=/; Domain=${domain}`
    ),
  ])
}
