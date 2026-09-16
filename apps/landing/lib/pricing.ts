import {
  AI_CREDIT_ACTION_CV_GENERATION,
  AI_CREDIT_ACTION_CV_IMPORT,
  AI_CREDIT_ACTION_LETTER_GENERATION,
  AI_CREDIT_ACTION_OFFER_ENRICHMENT,
  AI_CREDIT_COSTS,
  creditPackIds,
  creditPacks,
  type AiCreditAction,
  type CreditPackId,
} from "@cvforge/types"

import type { Locale } from "@/lib/i18n"

/** One application = offer analysis + tailored CV + cover letter. */
export const CREDITS_PER_APPLICATION =
  AI_CREDIT_COSTS[AI_CREDIT_ACTION_OFFER_ENRICHMENT] +
  AI_CREDIT_COSTS[AI_CREDIT_ACTION_CV_GENERATION] +
  AI_CREDIT_COSTS[AI_CREDIT_ACTION_LETTER_GENERATION]

export const pricedActions: AiCreditAction[] = [
  AI_CREDIT_ACTION_CV_IMPORT,
  AI_CREDIT_ACTION_OFFER_ENRICHMENT,
  AI_CREDIT_ACTION_CV_GENERATION,
  AI_CREDIT_ACTION_LETTER_GENERATION,
]

export interface PackSummary {
  id: CreditPackId
  label: string
  credits: number
  applications: number
  price: string
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

export function getPackSummaries(locale: Locale): PackSummary[] {
  return creditPackIds.map((id) => {
    const pack = creditPacks[id]
    return {
      id,
      label: pack.label,
      credits: pack.credits,
      applications: Math.floor(pack.credits / CREDITS_PER_APPLICATION),
      price: formatPrice(pack.priceCents, locale),
    }
  })
}

export function creditCost(action: AiCreditAction) {
  return AI_CREDIT_COSTS[action]
}
