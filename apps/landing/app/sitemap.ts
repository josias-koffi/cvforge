import { legalDocumentSlugs } from "@cvforge/types"
import type { MetadataRoute } from "next"

import { homePath, locales, storyPath, type Locale } from "@/lib/i18n"
import { legalPath } from "@/lib/legal"
import { siteUrl } from "@/lib/site"
import { freeTools, toolsPath } from "@/lib/tools"

type LocalizedPage = { path: (locale: Locale) => string; priority: number }

export default function sitemap(): MetadataRoute.Sitemap {
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
