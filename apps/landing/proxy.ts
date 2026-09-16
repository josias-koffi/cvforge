import { NextResponse, type NextRequest } from "next/server"

import { locales, negotiateLocale } from "@/lib/i18n"

/** Sends locale-less paths (e.g. "/") to the visitor's preferred language. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasLocalePrefix = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  )

  if (hasLocalePrefix) {
    return NextResponse.next()
  }

  const locale = negotiateLocale(request.headers.get("accept-language"))
  const url = request.nextUrl.clone()
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`

  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/((?!_next|login|.*\\.[a-z0-9]+$).*)"],
}
