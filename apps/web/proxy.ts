import { NextResponse, type NextRequest } from "next/server"

import { buildCsp, CSP_REPORT_PATH, newNonce } from "@/lib/csp"

const PUBLIC_PATHS = ["/login", "/register", "/forbidden", "/version", CSP_REPORT_PATH]

const CSP_HEADER = "Content-Security-Policy-Report-Only"

/** Fast redirect when no session cookie is present; the API still validates it. */
export function proxy(request: NextRequest) {
  const cookieName = process.env.AUTH_COOKIE_NAME?.trim() || "cvforge_session"
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )

  if (!isPublic && !request.cookies.has(cookieName)) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Next reads the nonce from the request's CSP header and stamps it on its
  // own scripts; the same value goes out on the response for the browser.
  const nonce = newNonce()
  const csp = buildCsp(nonce)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(CSP_HEADER, csp)
  requestHeaders.set("x-nonce", nonce)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set(CSP_HEADER, csp)

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[a-z0-9]+$).*)"],
}
