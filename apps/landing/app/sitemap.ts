import type { MetadataRoute } from "next"

import { homePath, locales, storyPath } from "@/lib/i18n"
import { siteUrl } from "@/lib/site"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  const pages = [
    { path: homePath, priority: 1 },
    { path: storyPath, priority: 0.5 },
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
