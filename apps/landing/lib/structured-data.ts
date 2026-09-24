import type { PublicCreditOffer } from "@cvforge/types"

import type { LandingDictionary } from "@/content/types"
import { homePath, type Locale } from "@/lib/i18n"

/**
 * schema.org graph of the home page: who publishes the site, what the product
 * is and what it costs, and the FAQ. Prices come from the live catalogue, so
 * search engines never see a price the pricing section does not show.
 */
export function homeStructuredData({
  base,
  locale,
  dict,
  offers,
}: {
  base: string
  locale: Locale
  dict: Pick<LandingDictionary, "meta" | "faq">
  offers: PublicCreditOffer[] | null
}) {
  const url = `${base}${homePath(locale)}`
  const organization = { "@id": `${base}/#organization` }
  const prices = (offers ?? []).map(({ priceCents }) => priceCents / 100)

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        ...organization,
        name: "CVSpark",
        url: base,
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        name: "CVSpark",
        url: base,
        inLanguage: locale,
        publisher: organization,
      },
      {
        "@type": "SoftwareApplication",
        name: "CVSpark",
        url,
        description: dict.meta.description,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: locale,
        publisher: organization,
        ...(prices.length > 0 && {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "EUR",
            lowPrice: Math.min(...prices),
            highPrice: Math.max(...prices),
            offerCount: prices.length,
          },
        }),
      },
      {
        "@type": "FAQPage",
        url: `${url}#faq`,
        mainEntity: dict.faq.items.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      },
    ],
  }
}

/** Serialises JSON-LD for a <script> tag; `<` is escaped so no text closes it. */
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}
