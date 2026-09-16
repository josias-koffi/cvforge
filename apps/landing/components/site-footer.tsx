import Link from "next/link"

import { Brand } from "@/components/brand"
import { buildNavLinks } from "@/components/site-header"
import type { LandingDictionary } from "@/content/types"
import { homePath, type Locale } from "@/lib/i18n"

export function SiteFooter({
  locale,
  dict,
}: {
  locale: Locale
  dict: Pick<LandingDictionary, "nav" | "footer">
}) {
  const links = buildNavLinks(locale, dict.nav)

  return (
    <footer className="border-t bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 md:flex-row md:justify-between">
        <div className="flex max-w-xs flex-col gap-3">
          <Brand href={homePath(locale)} label={dict.nav.home} />
          <p className="text-sm text-muted-foreground">{dict.footer.tagline}</p>
        </div>
        <nav aria-label={dict.footer.product}>
          <p className="mb-3 text-sm font-medium">{dict.footer.product}</p>
          <ul className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} {dict.footer.company}.{" "}
          {dict.footer.rights}
        </p>
      </div>
    </footer>
  )
}
