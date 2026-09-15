import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_PATHS = ["/login", "/register", "/forbidden"]

/** Fast redirect when no session cookie is present; the API still validates it. */
export function proxy(request: NextRequest) {
  const cookieName = process.env.AUTH_COOKIE_NAME?.trim() || "cvforge_session"
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )

  if (isPublic || request.cookies.has(cookieName)) {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL("/login", request.url))
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[a-z0-9]+$).*)"],
}
