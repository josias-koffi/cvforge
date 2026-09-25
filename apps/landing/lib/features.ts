import {
  AI_CREDIT_ACTION_CV_GENERATION,
  AI_CREDIT_ACTION_CV_IMPORT,
  AI_CREDIT_ACTION_INTERVIEW_SESSION,
  AI_CREDIT_ACTION_JOB_DIGEST_RERANK,
  AI_CREDIT_ACTION_LETTER_GENERATION,
  AI_CREDIT_ACTION_OFFER_ENRICHMENT,
  type AiCreditAction,
} from "@cvforge/types"
import {
  Building2Icon,
  FileTextIcon,
  MicIcon,
  SunriseIcon,
  type LucideIcon,
} from "lucide-react"

import type { FeatureKey } from "@/content/feature-pages/types"
import type { FreeToolKey, ScreenshotName } from "@/content/types"
import { featureSlugs, type Locale } from "@/lib/i18n"

export interface FeaturePage {
  key: FeatureKey
  path: (locale: Locale) => string
  icon: LucideIcon
  /** The capture under the page title, and the path its browser frame shows. */
  hero: { name: ScreenshotName; path: string }
  /** One capture per text block of the page, in the dictionary's order. */
  blocks: ScreenshotName[]
  /** The credit actions the feature can spend; none means it is free. */
  actions: AiCreditAction[]
  /** The free tools that lead into this feature, shown under the page. */
  tools: FreeToolKey[]
}

/**
 * The product features that have a page of their own (US-142), in the order
 * the journey tells them: find, apply, rehearse — and who is hiring.
 *
 * The home page, the header menu, the footer, the sitemap and the JSON-LD
 * read this list; a feature is added here the day its page ships.
 */
export const featurePages: FeaturePage[] = [
  {
    key: "daily_offers",
    path: featurePath("daily_offers"),
    icon: SunriseIcon,
    hero: { name: "daily-offers", path: "/offres-du-jour" },
    blocks: ["offer-ai", "offer-panel", "search-alerts", "job-search"],
    actions: [AI_CREDIT_ACTION_JOB_DIGEST_RERANK],
    tools: ["job_market", "keyword_match"],
  },
  {
    key: "tailored_documents",
    path: featurePath("tailored_documents"),
    icon: FileTextIcon,
    hero: { name: "cv-editor", path: "/candidatures/cv" },
    blocks: ["cv-editor", "letter-editor", "ats-report", "translate"],
    actions: [
      AI_CREDIT_ACTION_CV_IMPORT,
      AI_CREDIT_ACTION_OFFER_ENRICHMENT,
      AI_CREDIT_ACTION_CV_GENERATION,
      AI_CREDIT_ACTION_LETTER_GENERATION,
    ],
    tools: ["ats", "keyword_match"],
  },
  {
    key: "interview",
    path: featurePath("interview"),
    icon: MicIcon,
    hero: { name: "interview-studio", path: "/entretiens" },
    blocks: ["interview-studio", "interview-report", "interview-progress"],
    actions: [AI_CREDIT_ACTION_INTERVIEW_SESSION],
    tools: ["interview_questions"],
  },
  {
    key: "companies_market",
    path: featurePath("companies_market"),
    icon: Building2Icon,
    hero: { name: "companies", path: "/entreprises" },
    blocks: ["company-page", "market-radar"],
    actions: [],
    tools: ["company_check", "job_market"],
  },
]

export function featurePath(key: FeatureKey) {
  return (locale: Locale) => `/${locale}/${featureSlugs[key][locale]}`
}

export function findFeaturePage(key: FeatureKey) {
  return featurePages.find((page) => page.key === key)!
}
