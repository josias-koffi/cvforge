import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"

import {
  MarketPage,
  marketPageNames,
  marketPageSummary,
} from "@/components/job-market/market-page"
import { getDictionary } from "@/lib/dictionaries"
import { format, hasLocale, type Locale } from "@/lib/i18n"
import {
  fetchMarketPage,
  marketPagePath,
  parseMarketPageSegments,
} from "@/lib/market-pages"
import { pageMetadata } from "@/lib/seo"
import { siteUrl } from "@/lib/site"
import { jsonLd, marketPageStructuredData } from "@/lib/structured-data"
import { jobMarketPath, toolsPath } from "@/lib/tools"

/**
 * One job in one department (US-138), rendered on first request and kept a
 * day. Nothing is built ahead: the pairs follow the radar's data, which the
 * build cannot see, and a pair without enough data is a 404.
 */
// Literal, as Next reads it statically: MARKET_PAGE_REVALIDATE_SECONDS.
export const revalidate = 86400
export const dynamicParams = true

export function generateStaticParams() {
  return []
}

type Params = PageProps<"/[locale]/job-market/[job]/[department]">["params"]

async function load(params: Params) {
  const { locale, job, department } = await params
  const codes = parseMarketPageSegments(job, department)

  if (!hasLocale(locale) || !codes) return null

  const page = await fetchMarketPage(codes.romeCode, codes.department)

  return page ? { locale: locale as Locale, page, segments: { department, job } } : null
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/job-market/[job]/[department]">): Promise<Metadata> {
  const loaded = await load(params)
  if (!loaded) return {}

  const { locale, page } = loaded
  const text = getDictionary(locale).jobMarket.page
  const names = marketPageNames(page)
  const title = format(text.metaTitle, names)

  return {
    title,
    ...pageMetadata({
      locale,
      title,
      description: format(text.metaDescription, names),
      path: (other) => marketPagePath(other, page),
    }),
  }
}

export default async function Page({
  params,
}: PageProps<"/[locale]/job-market/[job]/[department]">) {
  const loaded = await load(params)
  if (!loaded) notFound()

  const { locale, page, segments } = loaded
  const path = marketPagePath(locale, page)

  // An old or hand-typed slug still names the right codes: send it to the
  // canonical address rather than serve the same page twice.
  if (path !== `${jobMarketPath(locale)}/${segments.job}/${segments.department}`) {
    permanentRedirect(path)
  }

  const dictionary = getDictionary(locale)
  const text = dictionary.jobMarket.page
  const crumbs = [
    { name: dictionary.nav.tools, path: toolsPath(locale) },
    { name: dictionary.tools.items.job_market.name, path: jobMarketPath(locale) },
    { name: format("{job}, {department}", marketPageNames(page)), path },
  ]
  const structuredData = marketPageStructuredData({
    base: siteUrl(),
    crumbs,
    description: marketPageSummary(page, text, locale),
    locale,
    page,
    title: format(text.title, marketPageNames(page)),
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      <MarketPage
        crumbs={crumbs}
        dictionary={dictionary.jobMarket}
        errors={dictionary.ats}
        locale={locale}
        page={page}
        toolPath={jobMarketPath(locale)}
      />
    </>
  )
}
