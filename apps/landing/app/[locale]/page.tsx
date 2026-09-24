import { notFound } from "next/navigation"

import { HomePage } from "@/components/home-page"
import { getDictionary } from "@/lib/dictionaries"
import { hasLocale } from "@/lib/i18n"
import { showTestimonials } from "@/lib/links"
import { fetchPublicOffers } from "@/lib/offers-api"
import { siteUrl } from "@/lib/site"
import { homeStructuredData, jsonLd } from "@/lib/structured-data"

// Offers are edited in the back-office: re-render the page at most every 5 minutes.
export const revalidate = 300

export default async function Page({ params }: PageProps<"/[locale]">) {
  const { locale } = await params
  if (!hasLocale(locale)) {
    notFound()
  }

  const offers = await fetchPublicOffers()
  const structuredData = homeStructuredData({
    base: siteUrl(),
    locale,
    dict: getDictionary(locale),
    offers,
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      <HomePage
        locale={locale}
        offers={offers}
        withTestimonials={showTestimonials()}
      />
    </>
  )
}
