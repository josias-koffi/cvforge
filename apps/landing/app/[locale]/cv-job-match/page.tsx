import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { KeywordMatchTool } from "@/components/keyword-match/keyword-match-tool"
import { Reveal } from "@/components/reveal"
import { Section } from "@/components/section"
import { getDictionary } from "@/lib/dictionaries"
import { hasLocale } from "@/lib/i18n"
import { pageMetadata } from "@/lib/seo"
import { keywordMatchPath } from "@/lib/tools"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/cv-job-match">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(locale)) {
    return {}
  }
  const { keywordMatch } = getDictionary(locale)

  return {
    title: keywordMatch.metaTitle,
    ...pageMetadata({
      locale,
      title: keywordMatch.metaTitle,
      description: keywordMatch.metaDescription,
      path: keywordMatchPath,
    }),
  }
}

/**
 * The free CV ↔ offer comparator (US-136). Served at /en/cv-job-match and,
 * through a rewrite in next.config, at /fr/comparateur-cv-offre.
 */
export default async function Page({
  params,
}: PageProps<"/[locale]/cv-job-match">) {
  const { locale } = await params
  if (!hasLocale(locale)) {
    notFound()
  }

  const { ats, keywordMatch } = getDictionary(locale)

  return (
    <Section className="py-16 md:py-24">
      <Reveal className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium text-primary">
          {keywordMatch.eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          {keywordMatch.title}
        </h1>
        <p className="text-lg text-pretty text-muted-foreground">
          {keywordMatch.subtitle}
        </p>
      </Reveal>
      <Reveal delay={0.1}>
        <KeywordMatchTool ats={ats} dictionary={keywordMatch} locale={locale} />
      </Reveal>
    </Section>
  )
}
