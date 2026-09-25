import { Cta } from "@/components/sections/cta"
import { DailyOffersSpotlight } from "@/components/sections/daily-offers-spotlight"
import { Faq } from "@/components/sections/faq"
import { FeaturesBento } from "@/components/sections/features-bento"
import { FreeTools } from "@/components/sections/free-tools"
import { Hero } from "@/components/sections/hero"
import { Interview } from "@/components/sections/interview"
import { Journey } from "@/components/sections/journey"
import { Pricing } from "@/components/sections/pricing"
import { Problem } from "@/components/sections/problem"
import { ProductShowcase } from "@/components/sections/product-showcase"
import { Testimonials } from "@/components/sections/testimonials"
import { Trust } from "@/components/sections/trust"
import { getDictionary } from "@/lib/dictionaries"
import type { PublicCreditOffer } from "@cvforge/types"

import type { Locale } from "@/lib/i18n"

export function HomePage({
  locale,
  offers,
  withTestimonials,
}: {
  locale: Locale
  offers: PublicCreditOffer[] | null
  withTestimonials: boolean
}) {
  const dict = getDictionary(locale)

  return (
    <>
      <Hero hero={dict.hero} locale={locale} />
      <Problem problem={dict.problem} />
      <Journey journey={dict.journey} locale={locale} />
      <DailyOffersSpotlight spotlight={dict.spotlight} locale={locale} />
      <FeaturesBento features={dict.features} locale={locale} />
      <ProductShowcase showcase={dict.showcase} />
      <Interview interview={dict.interview} locale={locale} />
      <FreeTools locale={locale} tools={dict.tools} />
      <Trust trust={dict.trust} />
      {withTestimonials ? (
        <Testimonials testimonials={dict.testimonials} />
      ) : null}
      <Pricing locale={locale} offers={offers} pricing={dict.pricing} />
      <Faq faq={dict.faq} locale={locale} />
      <Cta cta={dict.cta} locale={locale} />
    </>
  )
}
