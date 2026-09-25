import { getDictionary } from "@/lib/dictionaries"
import { hasLocale, locales } from "@/lib/i18n"
import { OG_SIZE, renderOgImage } from "@/lib/og-image"

export const size = OG_SIZE
export const contentType = "image/png"
export const alt = "CVSpark"

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const { hero } = getDictionary(hasLocale(locale) ? locale : "fr")

  return renderOgImage({
    title: hero.title,
    accent: hero.titleAccent,
    shot: "daily-offers",
  })
}
