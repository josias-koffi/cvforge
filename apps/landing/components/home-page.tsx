import { Cta } from "@/components/sections/cta"
import { Faq } from "@/components/sections/faq"
import { FeaturesBento } from "@/components/sections/features-bento"
import { FreeTools } from "@/components/sections/free-tools"
import { Hero } from "@/components/sections/hero"
import { Interview } from "@/components/sections/interview"
import { HowItWorks } from "@/components/sections/how-it-works"
import { Pricing } from "@/components/sections/pricing"
import { Problem } from "@/components/sections/problem"
import { ProductShowcase } from "@/components/sections/product-showcase"
import { Testimonials } from "@/components/sections/testimonials"
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
      <HowItWorks howItWorks={dict.howItWorks} />
      <FreeTools locale={locale} tools={dict.tools} />
      <FeaturesBento features={dict.features} />
      <Interview interview={dict.interview} />
      <ProductShowcase showcase={dict.showcase} />
      {withTestimonials ? (
        <Testimonials testimonials={dict.testimonials} />
      ) : null}
      <Pricing locale={locale} offers={offers} pricing={dict.pricing} />
      <Faq faq={dict.faq} locale={locale} />
      <Cta cta={dict.cta} locale={locale} />
    </>
  )
}
