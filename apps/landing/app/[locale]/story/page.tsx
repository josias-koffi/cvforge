import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { StoryPage } from "@/components/story-page"
import { getDictionary } from "@/lib/dictionaries"
import { hasLocale, storyPath } from "@/lib/i18n"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/story">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(locale)) {
    return {}
  }
  const { story } = getDictionary(locale)

  return {
    title: story.metaTitle,
    description: story.metaDescription,
    alternates: {
      canonical: storyPath(locale),
      languages: { fr: storyPath("fr"), en: storyPath("en") },
    },
  }
}

/** Served at /en/story and, through a rewrite in next.config, at /fr/histoire. */
export default async function Page({ params }: PageProps<"/[locale]/story">) {
  const { locale } = await params
  if (!hasLocale(locale)) {
    notFound()
  }

  return <StoryPage locale={locale} />
}
