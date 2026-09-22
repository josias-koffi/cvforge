import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AtsChecker } from "@/components/ats/ats-checker"
import { Section } from "@/components/section"
import { atsPath } from "@/lib/ats"
import { getDictionary } from "@/lib/dictionaries"
import { hasLocale } from "@/lib/i18n"
import { LOGIN_PATH } from "@/lib/links"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/ats-check">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(locale)) {
    return {}
  }
  const { ats } = getDictionary(locale)

  return {
    title: ats.metaTitle,
    description: ats.metaDescription,
    alternates: {
      canonical: atsPath(locale),
      languages: { fr: atsPath("fr"), en: atsPath("en") },
    },
  }
}

/** Served at /en/ats-check and, through a rewrite in next.config, at /fr/analyse-ats. */
export default async function Page({ params }: PageProps<"/[locale]/ats-check">) {
  const { locale } = await params
  if (!hasLocale(locale)) {
    notFound()
  }

  const { ats } = getDictionary(locale)

  return (
    <Section className="py-16 md:py-24">
      {/* Its own h1 rather than `SectionHeading`, which renders an h2: this is
          a page in its own right, not a section of the home page. */}
      <div className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium text-primary">{ats.eyebrow}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          {ats.title}
        </h1>
        <p className="text-lg text-pretty text-muted-foreground">
          {ats.subtitle}
        </p>
      </div>
      <AtsChecker ctaHref={LOGIN_PATH} dictionary={ats} />
    </Section>
  )
}
