import type { MetadataRoute } from "next"

import { isIndexable, siteUrl } from "@/lib/site"

// Read DEPLOY_ENV per request: one image serves staging and production.
export const dynamic = "force-dynamic"

/**
 * Production: crawl everything but the login redirect and the API, and here is
 * the sitemap. Elsewhere crawling stays allowed — a crawler must fetch a page
 * to see its noindex (proxy.ts) — but no sitemap invites it in.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexable()) {
    return { rules: { userAgent: "*", allow: "/" } }
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/login", "/api/"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
