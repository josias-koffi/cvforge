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
