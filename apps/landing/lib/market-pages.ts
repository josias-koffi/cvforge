import type {
  MarketPageEntry,
  MarketPageLink,
  PublicMarketPage,
} from "@cvforge/types"

import type { Locale } from "@/lib/i18n"
import { fetchSeoPageData, slugSegment } from "@/lib/seo-pages"
import { jobMarketPath } from "@/lib/tools"

/**
 * The page of one job in one department, e.g.
 * `/fr/metier-recrute/comptable-m1203/loire-atlantique-44`. The codes close
 * each segment: the words are for readers and may change with a label.
 */
export function marketPagePath(locale: Locale, link: MarketPageLink) {
  return [
    jobMarketPath(locale),
    slugSegment(link.romeLabel, link.romeCode),
    slugSegment(link.departmentLabel, link.department),
  ].join("/")
}

/** The codes a pair of URL segments names, or null when either is off. */
export function parseMarketPageSegments(job: string, department: string) {
  const romeCode = job.match(/(?:^|-)([a-n]\d{4})$/i)?.[1]?.toUpperCase()
  const departmentCode = department
    .match(/(?:^|-)(\d{2,3}|2[ab])$/i)?.[1]
    ?.toUpperCase()

  return romeCode && departmentCode
    ? { department: departmentCode, romeCode }
    : null
}

/** Every pair with a page, or none when the API cannot say. */
export async function fetchMarketPages(
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch
): Promise<MarketPageEntry[]> {
  const payload = await fetchSeoPageData<{ pages?: MarketPageEntry[] }>(
    "/public/market-pages",
    env,
    fetcher
  )

  return payload?.pages ?? []
}

/**
 * One page's content, or null — for a pair without enough data as for an API
 * that cannot answer. Either way the page is a 404: never an empty shell.
 */
export function fetchMarketPage(
  romeCode: string,
  department: string,
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch
): Promise<PublicMarketPage | null> {
  return fetchSeoPageData<PublicMarketPage>(
    `/public/market-pages/${encodeURIComponent(romeCode)}/${encodeURIComponent(department)}`,
    env,
    fetcher
  )
}
