import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { JobMarketTool } from "@/components/job-market/job-market-tool"
import { Reveal } from "@/components/reveal"
import { Section } from "@/components/section"
import { getDictionary } from "@/lib/dictionaries"
import { hasLocale } from "@/lib/i18n"
import { pageMetadata } from "@/lib/seo"
import { jobMarketPath } from "@/lib/tools"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/job-market">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(locale)) {
    return {}
  }
  const { jobMarket } = getDictionary(locale)

  return {
    title: jobMarket.metaTitle,
    ...pageMetadata({
      locale,
      title: jobMarket.metaTitle,
      description: jobMarket.metaDescription,
      path: jobMarketPath,
    }),
  }
}

/**
 * The free "does this job hire near me?" tool (US-137). Served at
 * /en/job-market and, through a rewrite in next.config, at /fr/metier-recrute.
 */
export default async function Page({
  params,
}: PageProps<"/[locale]/job-market">) {
  const { locale } = await params
  if (!hasLocale(locale)) {
    notFound()
  }

  const { ats, jobMarket } = getDictionary(locale)

  return (
    <Section className="py-16 md:py-24">
      <Reveal className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium text-primary">{jobMarket.eyebrow}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          {jobMarket.title}
        </h1>
        <p className="text-lg text-pretty text-muted-foreground">
          {jobMarket.subtitle}
        </p>
      </Reveal>
      <Reveal delay={0.1}>
        <JobMarketTool dictionary={jobMarket} errors={ats} locale={locale} />
      </Reveal>
    </Section>
  )
}
