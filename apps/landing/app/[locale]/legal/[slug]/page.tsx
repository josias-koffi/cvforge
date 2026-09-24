import { legalDocumentSlugs } from "@cvforge/types"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { LegalPage } from "@/components/legal-page"
import { getDictionary } from "@/lib/dictionaries"
import { format, hasLocale, locales, type Locale } from "@/lib/i18n"
import { legalPath, legalSlugFromPath, legalSlugs } from "@/lib/legal"
import { fetchLegalDocument } from "@/lib/legal-api"
import { pageMetadata } from "@/lib/seo"

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    legalDocumentSlugs.map((slug) => ({
      locale,
      slug: legalSlugs[slug][locale],
    }))
  )
}

/**
 * Resolves the URL segment to a document, but only when it is the segment this
 * locale uses: `/en/legal/cgu` redirects to `/en/legal/terms` in next.config,
 * it is not served here.
 */
function resolve(locale: string, segment: string) {
  if (!hasLocale(locale)) {
    return null
  }

  const slug = legalSlugFromPath(segment)

  return slug && legalSlugs[slug][locale] === segment
    ? { locale: locale as Locale, slug }
    : null
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/legal/[slug]">): Promise<Metadata> {
  const { locale, slug: segment } = await params
  const resolved = resolve(locale, segment)

  if (!resolved) {
    return {}
  }

  const document = await fetchLegalDocument(resolved.slug)

  if (!document) {
    return {}
  }

  const title = document.title[resolved.locale]
  const { legal } = getDictionary(resolved.locale)

  return {
    title,
    ...pageMetadata({
      locale: resolved.locale,
      title,
      description: format(legal.metaDescription, { title }),
      path: (locale) => legalPath(locale, resolved.slug),
    }),
  }
}

export default async function Page({
  params,
}: PageProps<"/[locale]/legal/[slug]">) {
  const { locale, slug: segment } = await params
  const resolved = resolve(locale, segment)

  if (!resolved) {
    notFound()
  }

  const document = await fetchLegalDocument(resolved.slug)

  // No document means the API could not serve it. A legal page shows the text
  // in force or nothing at all — never an empty shell.
  if (!document) {
    notFound()
  }

  return (
    <LegalPage
      document={document}
      locale={resolved.locale}
      updatedLabel={getDictionary(resolved.locale).legal.updated}
    />
  )
}
