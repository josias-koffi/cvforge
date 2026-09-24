import { legalDocumentSlugs } from "@cvforge/types"
import type { MetadataRoute } from "next"

import { homePath, locales, storyPath, type Locale } from "@/lib/i18n"
import { legalPath } from "@/lib/legal"
import { siteUrl } from "@/lib/site"
import { fetchMarketPages, marketPagePath } from "@/lib/market-pages"
import { freeTools, toolsPath } from "@/lib/tools"

/** Regenerated as often as the job × department pages it lists (US-138). */
export const revalidate = 86400

type LocalizedPage = {
  path: (locale: Locale) => string
  priority: number
  lastModified?: string
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const pages: LocalizedPage[] = [
    { path: homePath, priority: 1 },
    // The free tools are the top of the acquisition funnel, so they rank
    // just below the home page rather than alongside the story.
    ...freeTools.map(({ path }) => ({ path, priority: 0.8 })),
    { path: toolsPath, priority: 0.7 },
    { path: storyPath, priority: 0.5 },
    ...legalDocumentSlugs.map((slug) => ({
      path: (locale: Locale) => legalPath(locale, slug),
      priority: 0.3,
    })),
    // Only pairs with a page: an API that cannot answer lists none, and the
    // rest of the sitemap is served all the same.
    ...(await fetchMarketPages()).map((page) => ({
      path: (locale: Locale) => marketPagePath(locale, page),
      priority: 0.6,
      lastModified: page.refreshedAt,
    })),
  ]

  return pages.flatMap(({ path, priority, lastModified }) =>
    locales.map((locale) => ({
      url: `${base}${path(locale)}`,
      priority,
      ...(lastModified ? { lastModified } : {}),
      alternates: {
        languages: Object.fromEntries(
          locales.map((other) => [other, `${base}${path(other)}`])
        ),
      },
    }))
  )
}
