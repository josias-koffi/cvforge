import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { featureCrumbs, FeaturePageView } from "@/components/feature-page"
import type { FeatureKey } from "@/content/feature-pages/types"
import { getDictionary } from "@/lib/dictionaries"
import { findFeaturePage } from "@/lib/features"
import { hasLocale, locales } from "@/lib/i18n"
import { renderOgImage } from "@/lib/og-image"
import { pageMetadata } from "@/lib/seo"
import { siteUrl } from "@/lib/site"
import { featurePageStructuredData, jsonLd } from "@/lib/structured-data"

type LocaleParams = { params: Promise<{ locale: string }> }

/**
 * The four feature pages are one template fed by the registry and the
 * dictionaries: each route file only names its feature.
 */
export function featureMetadata(key: FeatureKey) {
  return async function generateMetadata({
    params,
  }: LocaleParams): Promise<Metadata> {
    const { locale } = await params
    if (!hasLocale(locale)) {
      return {}
    }
    const feature = findFeaturePage(key)
    const page = getDictionary(locale).featurePages.pages[key]

    return {
      title: page.metaTitle,
      ...pageMetadata({
        locale,
        title: page.metaTitle,
        description: page.metaDescription,
        path: feature.path,
        image: `${feature.path(locale)}/opengraph-image`,
      }),
    }
  }
}

export function featureRoute(key: FeatureKey) {
  return async function Page({ params }: LocaleParams) {
    const { locale } = await params
    if (!hasLocale(locale)) {
      notFound()
    }

    const dict = getDictionary(locale)
    const feature = findFeaturePage(key)
    const structuredData = featurePageStructuredData({
      base: siteUrl(),
      locale,
      page: dict.featurePages.pages[key],
      crumbs: featureCrumbs(locale, feature, dict),
    })

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
        />
        <FeaturePageView locale={locale} feature={feature} dict={dict} />
      </>
    )
  }
}

export function featureOgParams() {
  return locales.map((locale) => ({ locale }))
}

/** The share card of a feature page: its title over its hero capture. */
export function featureOgImage(key: FeatureKey) {
  return async function OpengraphImage({ params }: LocaleParams) {
    const { locale } = await params
    const page = getDictionary(hasLocale(locale) ? locale : "fr").featurePages
      .pages[key]

    return renderOgImage({
      title: page.title,
      accent: page.titleAccent,
      shot: findFeaturePage(key).hero.name,
    })
  }
}
