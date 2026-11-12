import { NextResponse, type NextRequest } from "next/server"

import { locales, negotiateLocale } from "@/lib/i18n"
import { isIndexable, NOINDEX_HEADER } from "@/lib/site"

/**
 * Sends locale-less paths (e.g. "/") to the visitor's preferred language, and
 * marks every page noindex outside production (the pages are static HTML: the
 * deployment is only known here, at request time).
 */
export function proxy(request: NextRequest) {
  const response = route(request)
  if (!isIndexable()) {
    response.headers.set(...NOINDEX_HEADER)
  }
  return response
}

function route(request: NextRequest) {
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

/**
 * `api` is excluded alongside `_next` and `login`: route handlers have no
 * locale, and prefixing one turns the browser's POST into a redirect to
 * `/en/api/…`, which does not exist. That 404 broke the whole ATS funnel while
 * every unit test still passed — they call the handler directly, never through
 * this proxy.
 */
export const config = {
  matcher: ["/((?!_next|api|login|.*\\.[a-z0-9]+$).*)"],
}
