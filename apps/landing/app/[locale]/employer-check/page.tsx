import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CompanyCheckTool } from "@/components/company-check/company-check-tool"
import { Reveal } from "@/components/reveal"
import { Section } from "@/components/section"
import { getDictionary } from "@/lib/dictionaries"
import { hasLocale } from "@/lib/i18n"
import { pageMetadata } from "@/lib/seo"
import { companyCheckPath } from "@/lib/tools"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/employer-check">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(locale)) {
    return {}
  }
  const { companyCheck } = getDictionary(locale)

  return {
    title: companyCheck.metaTitle,
    ...pageMetadata({
      locale,
      title: companyCheck.metaTitle,
      description: companyCheck.metaDescription,
      path: companyCheckPath,
    }),
  }
}

/**
 * The free "check an employer" tool (US-139). Served at /en/employer-check
 * and, through a rewrite in next.config, at /fr/verifier-employeur.
 */
export default async function Page({
  params,
}: PageProps<"/[locale]/employer-check">) {
  const { locale } = await params
  if (!hasLocale(locale)) {
    notFound()
  }

  const { ats, companyCheck } = getDictionary(locale)

  return (
    <Section className="py-16 md:py-24">
      <Reveal className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium text-primary">{companyCheck.eyebrow}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          {companyCheck.title}
        </h1>
        <p className="text-lg text-pretty text-muted-foreground">
          {companyCheck.subtitle}
        </p>
      </Reveal>
      <Reveal delay={0.1}>
        <CompanyCheckTool dictionary={companyCheck} errors={ats} locale={locale} />
      </Reveal>
    </Section>
  )
}
