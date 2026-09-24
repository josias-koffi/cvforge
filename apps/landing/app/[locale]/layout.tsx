import type { Metadata } from "next"
import { Geist_Mono, Inter } from "next/font/google"
import { notFound } from "next/navigation"

import "../globals.css"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { ThemeProvider } from "@/components/theme"
import { getDictionary } from "@/lib/dictionaries"
import { hasLocale, homePath, locales } from "@/lib/i18n"
import { pageMetadata } from "@/lib/seo"
import { siteUrl } from "@/lib/site"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(locale)) {
    return {}
  }
  const { meta } = getDictionary(locale)

  return {
    metadataBase: new URL(siteUrl()),
    title: { default: meta.title, template: "%s · CVSpark" },
    applicationName: "CVSpark",
    ...pageMetadata({
      locale,
      title: meta.title,
      description: meta.description,
      path: homePath,
    }),
  }
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params
  if (!hasLocale(locale)) {
    notFound()
  }
  const dict = getDictionary(locale)

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(
        "scroll-smooth antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body className="flex min-h-svh flex-col">
        <ThemeProvider>
          <SiteHeader locale={locale} nav={dict.nav} />
          <main className="flex-1">{children}</main>
          <SiteFooter locale={locale} dict={dict} />
        </ThemeProvider>
      </body>
    </html>
  )
}
