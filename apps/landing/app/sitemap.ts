import { legalDocumentSlugs } from "@cvforge/types"
import type { MetadataRoute } from "next"

import { homePath, locales, storyPath, type Locale } from "@/lib/i18n"
import { legalPath } from "@/lib/legal"
import { siteUrl } from "@/lib/site"

type LocalizedPage = { path: (locale: Locale) => string; priority: number }

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  const pages: LocalizedPage[] = [
    { path: homePath, priority: 1 },
    { path: storyPath, priority: 0.5 },
    ...legalDocumentSlugs.map((slug) => ({
      path: (locale: Locale) => legalPath(locale, slug),
      priority: 0.3,
    })),
  ]

  return pages.flatMap(({ path, priority }) =>
    locales.map((locale) => ({
      url: `${base}${path(locale)}`,
      priority,
      alternates: {
        languages: Object.fromEntries(
          locales.map((other) => [other, `${base}${path(other)}`])
        ),
      },
    }))
  )
}
