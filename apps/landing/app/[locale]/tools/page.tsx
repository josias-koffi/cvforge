import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ToolsPage } from "@/components/tools-page"
import { getDictionary } from "@/lib/dictionaries"
import { hasLocale } from "@/lib/i18n"
import { pageMetadata } from "@/lib/seo"
import { siteUrl } from "@/lib/site"
import { jsonLd, toolsStructuredData } from "@/lib/structured-data"
import { toolsPath } from "@/lib/tools"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/tools">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(locale)) {
    return {}
  }
  const { tools } = getDictionary(locale)

  return {
    title: tools.metaTitle,
    ...pageMetadata({
      locale,
      title: tools.metaTitle,
      description: tools.metaDescription,
      path: toolsPath,
    }),
  }
}

/** Served at /en/tools and, through a rewrite in next.config, at /fr/outils. */
export default async function Page({ params }: PageProps<"/[locale]/tools">) {
  const { locale } = await params
  if (!hasLocale(locale)) {
    notFound()
  }

  const structuredData = toolsStructuredData({
    base: siteUrl(),
    locale,
    tools: getDictionary(locale).tools,
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      <ToolsPage locale={locale} />
    </>
  )
}
