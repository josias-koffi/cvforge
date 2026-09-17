import { notFound } from "next/navigation"

import { HomePage } from "@/components/home-page"
import { hasLocale } from "@/lib/i18n"
import { showTestimonials } from "@/lib/links"
import { fetchPublicOffers } from "@/lib/offers-api"

// Offers are edited in the back-office: re-render the page at most every 5 minutes.
export const revalidate = 300

export default async function Page({ params }: PageProps<"/[locale]">) {
  const { locale } = await params
  if (!hasLocale(locale)) {
    notFound()
  }

  return (
    <HomePage
      locale={locale}
      offers={await fetchPublicOffers()}
      withTestimonials={showTestimonials()}
    />
  )
}
