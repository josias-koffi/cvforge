import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"

import {
  CompanyPage,
  companyPageSummary,
} from "@/components/company-check/company-page"
import {
  companyPagePath,
  fetchCompanyPage,
  parseCompanyPageSegment,
} from "@/lib/company-pages"
import { getDictionary } from "@/lib/dictionaries"
import { format, hasLocale, type Locale } from "@/lib/i18n"
import { pageMetadata } from "@/lib/seo"
import { siteUrl } from "@/lib/site"
import { companyPageStructuredData, jsonLd } from "@/lib/structured-data"
import { companyCheckPath, toolsPath } from "@/lib/tools"

/**
 * One company (US-140), rendered on first request and kept a day. Nothing
 * is built ahead: the companies follow the hourly refresh, which the build
 * cannot see, and a company without a page is a 404.
 */
// Literal, as Next reads it statically: SEO_PAGE_REVALIDATE_SECONDS.
export const revalidate = 86400
export const dynamicParams = true

export function generateStaticParams() {
  return []
}

type Params = PageProps<"/[locale]/employer-check/[company]">["params"]

async function load(params: Params) {
  const { locale, company } = await params
  const siren = parseCompanyPageSegment(company)

  if (!hasLocale(locale) || !siren) return null

  const page = await fetchCompanyPage(siren)

  return page ? { locale: locale as Locale, page, segment: company } : null
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/employer-check/[company]">): Promise<Metadata> {
  const loaded = await load(params)
  if (!loaded) return {}

  const { locale, page } = loaded
  const dictionary = getDictionary(locale).companyCheck
  const text = dictionary.page
  const title = format(text.metaTitle, { name: page.name })

  return {
    title,
    ...pageMetadata({
      locale,
      title,
      description: format(text.metaDescription, {
        name: page.name,
        siren: page.siren,
        summary: companyPageSummary(page, dictionary, locale),
      }),
      path: (other) => companyPagePath(other, page),
    }),
  }
}

export default async function Page({
  params,
}: PageProps<"/[locale]/employer-check/[company]">) {
  const loaded = await load(params)
  if (!loaded) notFound()

  const { locale, page, segment } = loaded
  const path = companyPagePath(locale, page)

  // An old or hand-typed slug still names the right SIREN: send it to the
  // canonical address rather than serve the same page twice.
  if (path !== `${companyCheckPath(locale)}/${segment}`) {
    permanentRedirect(path)
  }

  const dictionary = getDictionary(locale)
  const text = dictionary.companyCheck
  const crumbs = [
    { name: dictionary.nav.tools, path: toolsPath(locale) },
    {
      name: dictionary.tools.items.company_check.name,
      path: companyCheckPath(locale),
    },
    { name: format(text.page.title, { name: page.name }), path },
  ]
  const structuredData = companyPageStructuredData({
    base: siteUrl(),
    crumbs,
    description: companyPageSummary(page, text, locale),
    locale,
    page,
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      <CompanyPage
        crumbs={crumbs}
        dictionary={text}
        errors={dictionary.ats}
        locale={locale}
        page={page}
        toolPath={companyCheckPath(locale)}
      />
    </>
  )
}
