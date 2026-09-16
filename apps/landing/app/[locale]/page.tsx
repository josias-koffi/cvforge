import { notFound } from "next/navigation"

import { HomePage } from "@/components/home-page"
import { hasLocale } from "@/lib/i18n"
import { showTestimonials } from "@/lib/links"

export default async function Page({ params }: PageProps<"/[locale]">) {
  const { locale } = await params
  if (!hasLocale(locale)) {
    notFound()
  }

  return <HomePage locale={locale} withTestimonials={showTestimonials()} />
}
