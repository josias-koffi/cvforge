/** Any origin would do: it only has to be one no real path can escape to. */
const BASE = "http://next-path.invalid"
const CONTROL = /[\u0000-\u001f\u007f]/
/** `//host` or `/\host`: a browser reads either as another origin. */
const OTHER_ORIGIN = /^\/[/\\]/

/**
 * Where to go after signing in, when a free tool's link named a screen
 * (US-133). Only a path of this app.
 *
 * Resolved as a browser would, rather than pattern-matched: `/\t/evil.com`
 * slips past a prefix check, then the browser drops the tab and leaves for
 * `evil.com`. Control characters are refused outright for the same reason,
 * and so is any result that dot segments turned into `//host`.
 */
export function safeNextPath(value: string | string[] | undefined) {
  const path = Array.isArray(value) ? value[0] : value

  if (!path || !path.startsWith("/") || CONTROL.test(path)) return null

  try {
    const url = new URL(path, BASE)
    // Checked after resolution too: dot segments collapse `/.//evil.com`
    // into `//evil.com`, which a browser reads as another origin.
    const resolved = `${url.pathname}${url.search}${url.hash}`

    return url.origin === BASE && !OTHER_ORIGIN.test(resolved) ? resolved : null
  } catch {
    return null
  }
}
