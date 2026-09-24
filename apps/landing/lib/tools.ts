import {
  Building2Icon,
  FileSearchIcon,
  ListChecksIcon,
  MapPinnedIcon,
  type LucideIcon,
} from "lucide-react"

import type { FreeToolKey } from "@/content/types"
import { atsPath } from "@/lib/ats"
import {
  companyCheckSlugs,
  jobMarketSlugs,
  keywordMatchSlugs,
  toolsSlugs,
  type Locale,
} from "@/lib/i18n"

export interface FreeTool {
  key: FreeToolKey
  path: (locale: Locale) => string
  icon: LucideIcon
}

/**
 * The free tools that are live, in the order they are shown (US-135).
 *
 * A tool enters this list the day its page ships, never before: the hub, the
 * home section and the JSON-LD all read it, so an announced-but-missing tool
 * would be a dead card for visitors and a broken URL for search engines.
 */
export const freeTools: FreeTool[] = [
  { key: "ats", path: atsPath, icon: FileSearchIcon },
  { key: "keyword_match", path: keywordMatchPath, icon: ListChecksIcon },
  { key: "job_market", path: jobMarketPath, icon: MapPinnedIcon },
  { key: "company_check", path: companyCheckPath, icon: Building2Icon },
]

export function keywordMatchPath(locale: Locale) {
  return `/${locale}/${keywordMatchSlugs[locale]}`
}

export function jobMarketPath(locale: Locale) {
  return `/${locale}/${jobMarketSlugs[locale]}`
}

export function companyCheckPath(locale: Locale) {
  return `/${locale}/${companyCheckSlugs[locale]}`
}

export function toolsPath(locale: Locale) {
  return `/${locale}/${toolsSlugs[locale]}`
}
