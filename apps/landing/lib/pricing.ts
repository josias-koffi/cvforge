import {
  AI_CREDIT_ACTION_CV_GENERATION,
  AI_CREDIT_ACTION_CV_IMPORT,
  AI_CREDIT_ACTION_LETTER_GENERATION,
  AI_CREDIT_ACTION_OFFER_ENRICHMENT,
  AI_CREDIT_COSTS,
  estimateApplications,
  type AiCreditAction,
  type PublicCreditOffer,
} from "@cvforge/types"

import type { Locale } from "@/lib/i18n"

export const pricedActions: AiCreditAction[] = [
  AI_CREDIT_ACTION_CV_IMPORT,
  AI_CREDIT_ACTION_OFFER_ENRICHMENT,
  AI_CREDIT_ACTION_CV_GENERATION,
  AI_CREDIT_ACTION_LETTER_GENERATION,
]

export interface PackSummary {
  id: string
  label: string
  description: string
  features: string[]
  credits: number
  applications: number
  price: string
  /** Price of one complete application, or null when the pack covers none. */
  unitPrice: string | null
  featured: boolean
}

export function formatPrice(priceCents: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(priceCents / 100)
}

export function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-IE").format(
    value
  )
}

/** Offers come from the API already sorted in the admin's display order. */
export function toPackSummaries(
  offers: PublicCreditOffer[],
  locale: Locale
): PackSummary[] {
  return offers.map((offer) => {
    const applications = estimateApplications(offer.credits)

    return {
      id: offer.id,
      label: offer.name[locale] || offer.name.fr,
      description: offer.description[locale] || offer.description.fr,
      features: offer.features[locale].length
        ? offer.features[locale]
        : offer.features.fr,
      credits: offer.credits,
      applications,
      price: formatPrice(offer.priceCents, locale),
      unitPrice: applications
        ? formatPrice(Math.round(offer.priceCents / applications), locale)
        : null,
      featured: offer.isFeatured,
    }
  })
}

export function creditCost(action: AiCreditAction) {
  return AI_CREDIT_COSTS[action]
}
