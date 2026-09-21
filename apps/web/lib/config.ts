function normalizeUrl(value: string) {
  return value.replace(/\/$/, "")
}

export function getServerApiUrl() {
  return normalizeUrl(
    process.env.API_INTERNAL_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:3333"
  )
}

export function getAuthCookieName() {
  return process.env.AUTH_COOKIE_NAME?.trim() || "cvforge_session"
}

/**
 * The public site, where the legal documents are published. Read at request
 * time, never baked in: one image must be able to serve any deployment.
 */
export function landingUrl(path: string) {
  const base = normalizeUrl(
    process.env.LANDING_URL?.trim() || "http://localhost:3101"
  )

  return `${base}${path}`
}

/** Where each document a new account has to agree to lives on the site. */
export const LEGAL_LINKS = {
  terms: "/fr/legal/cgu",
  privacy: "/fr/legal/confidentialite",
} as const

/**
 * In-app address of a legal document. It resolves to a route handler that
 * redirects to the public site, so a link rendered in the browser never needs
 * the site's origin at build time.
 */
export function legalPath(document: keyof typeof LEGAL_LINKS) {
  return `/legal/${document}`
}
