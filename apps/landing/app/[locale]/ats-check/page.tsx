import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ShieldCheckIcon, TimerIcon, UserXIcon } from "lucide-react"

import { AtsChecker } from "@/components/ats/ats-checker"
import { Reveal } from "@/components/reveal"
import { Section } from "@/components/section"
import { atsPath } from "@/lib/ats"
import { getDictionary } from "@/lib/dictionaries"
import { hasLocale } from "@/lib/i18n"
import { LOGIN_PATH } from "@/lib/links"
import { pageMetadata } from "@/lib/seo"

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
    ...pageMetadata({
      locale,
      title: ats.metaTitle,
      description: ats.metaDescription,
      path: atsPath,
    }),
  }
}

/** Served at /en/ats-check and, through a rewrite in next.config, at /fr/analyse-ats. */
export default async function Page({
  params,
}: PageProps<"/[locale]/ats-check">) {
  const { locale } = await params
  if (!hasLocale(locale)) {
    notFound()
  }

  const { ats } = getDictionary(locale)

  return (
    <Section className="py-16 md:py-24">
      {/* Its own h1 rather than `SectionHeading`, which renders an h2: this is
          a page in its own right, not a section of the home page. */}
      <Reveal className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium text-primary">{ats.eyebrow}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          {ats.title}
        </h1>
        <p className="text-lg text-pretty text-muted-foreground">
          {ats.subtitle}
        </p>
        <ul className="mt-2 flex flex-wrap justify-center gap-2">
          {[
            { Icon: ShieldCheckIcon, label: ats.trust.private },
            { Icon: TimerIcon, label: ats.trust.fast },
            { Icon: UserXIcon, label: ats.trust.noSignup },
          ].map(({ Icon, label }) => (
            <li
              className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-surface"
              key={label}
            >
              <Icon className="size-3.5 text-primary" />
              {label}
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal delay={0.1}>
        <AtsChecker ctaHref={LOGIN_PATH} dictionary={ats} locale={locale} />
      </Reveal>
    </Section>
  )
}
