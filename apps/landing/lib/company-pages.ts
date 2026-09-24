import type {
  CompanyPageEntry,
  CompanyPageLink,
  PublicCompanyPage,
} from "@cvforge/types"

import type { Locale } from "@/lib/i18n"
import { fetchSeoPageData, slugSegment } from "@/lib/seo-pages"
import { companyCheckPath } from "@/lib/tools"

/**
 * The page of one company, e.g. `/fr/verifier-employeur/everience-381983568`
 * (US-140). The SIREN closes the segment: the name is for readers.
 */
export function companyPagePath(locale: Locale, link: CompanyPageLink) {
  return `${companyCheckPath(locale)}/${slugSegment(link.name, link.siren)}`
}

/** The SIREN a URL segment names, or null. */
export function parseCompanyPageSegment(segment: string) {
  return segment.match(/(?:^|-)(\d{9})$/)?.[1] ?? null
}

/** Every company with a page, or none when the API cannot say. */
export async function fetchCompanyPages(
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch
): Promise<CompanyPageEntry[]> {
  const payload = await fetchSeoPageData<{ pages?: CompanyPageEntry[] }>(
    "/public/company-pages",
    env,
    fetcher
  )

  return payload?.pages ?? []
}

/**
 * One company's page, or null — for a company without a page as for an API
 * that cannot answer. Either way the page is a 404: never an empty shell.
 */
export function fetchCompanyPage(
  siren: string,
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch
): Promise<PublicCompanyPage | null> {
  return fetchSeoPageData<PublicCompanyPage>(
    `/public/company-pages/${encodeURIComponent(siren)}`,
    env,
    fetcher
  )
}
