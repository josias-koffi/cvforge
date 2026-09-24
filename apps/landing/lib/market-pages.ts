import type {
  MarketPageEntry,
  MarketPageLink,
  PublicMarketPage,
} from "@cvforge/types"

import type { Locale } from "@/lib/i18n"
import { apiUrl } from "@/lib/offers-api"
import { jobMarketPath } from "@/lib/tools"

/**
 * The figures change once a month at most: a page rendered today is reused
 * for a day before the API is asked again (US-138).
 */
export const MARKET_PAGE_REVALIDATE_SECONDS = 86_400

/** "Développeur / Développeuse web" → "developpeur-developpeuse-web". */
export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function segment(label: string, code: string) {
  const words = slugify(label)
  const tail = code.toLowerCase()

  return words ? `${words}-${tail}` : tail
}

/**
 * The page of one job in one department, e.g.
 * `/fr/metier-recrute/comptable-m1203/loire-atlantique-44`. The codes close
 * each segment: the words are for readers and may change with a label.
 */
export function marketPagePath(locale: Locale, link: MarketPageLink) {
  return [
    jobMarketPath(locale),
    segment(link.romeLabel, link.romeCode),
    segment(link.departmentLabel, link.department),
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
  try {
    const response = await fetcher(`${apiUrl(env)}/public/market-pages`, {
      next: { revalidate: MARKET_PAGE_REVALIDATE_SECONDS },
    })
    if (!response.ok) return []

    const payload = (await response.json()) as { pages?: MarketPageEntry[] }

    return payload.pages ?? []
  } catch {
    return []
  }
}

/**
 * One page's content, or null — for a pair without enough data as for an API
 * that cannot answer. Either way the page is a 404: never an empty shell.
 */
export async function fetchMarketPage(
  romeCode: string,
  department: string,
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch
): Promise<PublicMarketPage | null> {
  try {
    const response = await fetcher(
      `${apiUrl(env)}/public/market-pages/${encodeURIComponent(romeCode)}/${encodeURIComponent(department)}`,
      { next: { revalidate: MARKET_PAGE_REVALIDATE_SECONDS } }
    )

    return response.ok ? ((await response.json()) as PublicMarketPage) : null
  } catch {
    return null
  }
}
