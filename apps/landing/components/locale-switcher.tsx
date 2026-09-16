"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { localizedPath, locales, type Locale } from "@/lib/i18n"

export function LocaleSwitcher({
  locale,
  label,
}: {
  locale: Locale
  label: string
}) {
  const pathname = usePathname() ?? `/${locale}`
  const target = locales.find((candidate) => candidate !== locale) ?? locale

  return (
    <Button variant="ghost" size="sm" asChild>
      <Link
        href={localizedPath(pathname, target)}
        hrefLang={target}
        aria-label={label}
        title={label}
        className="font-mono uppercase"
      >
        {target}
      </Link>
    </Button>
  )
}
