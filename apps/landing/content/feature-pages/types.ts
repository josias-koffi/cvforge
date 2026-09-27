/** The product features that have a page of their own (US-142). */
export type FeatureKey =
  | "daily_offers"
  | "tailored_documents"
  | "interview"
  | "companies_market"

interface TitledText {
  title: string
  body: string
}

/**
 * Copy of one feature page. The screenshots each block shows are named in
 * `lib/features.ts`, next to the route: the dictionary holds words only.
 */
export interface FeaturePageDictionary {
  metaTitle: string
  metaDescription: string
  /** How menus, cards and cross-links name the page. */
  card: { name: string; description: string }
  eyebrow: string
  /** The page's h1: carries the search query the page targets. */
  title: string
  titleAccent: string
  subtitle: string
  primaryCta: string
  heroAlt: string
  /** Three short facts under the hero, each a figure or a word and its label. */
  stats: { value: string; label: string }[]
  /** Alternating text and screenshot blocks; one screenshot per block. */
  blocks: (TitledText & { eyebrow: string; points: string[]; alt: string })[]
  difference: { eyebrow: string; title: string; items: TitledText[] }
  /** What the feature costs; the figures come from `AI_CREDIT_COSTS`. */
  pricing: { title: string; body: string }
  faq: { title: string; items: { question: string; answer: string }[] }
}

/** Shared chrome of every feature page, and the hub-like bits around them. */
export interface FeaturePagesDictionary {
  /** Accessible name of the breadcrumb trail above the title. */
  breadcrumbLabel: string
  learnMore: string
  pricingFree: string
  /** Credit unit, by the count it follows: "1 crédit", "3 crédits". */
  pricingCreditUnit: { one: string; other: string }
  related: { title: string; tools: string }
  cta: { title: string; body: string; button: string }
  pages: Record<FeatureKey, FeaturePageDictionary>
}
