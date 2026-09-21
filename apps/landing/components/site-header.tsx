import Link from "next/link"

import { Brand } from "@/components/brand"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { MobileNav, type NavLink } from "@/components/mobile-nav"
import { ThemeToggle } from "@/components/theme"
import { Button } from "@/components/ui/button"
import type { LandingDictionary } from "@/content/types"
import { homePath, storyPath, type Locale } from "@/lib/i18n"
import { LOGIN_PATH } from "@/lib/links"

export function buildNavLinks(
  locale: Locale,
  nav: LandingDictionary["nav"]
): NavLink[] {
  return [
    { href: homePath(locale, "features"), label: nav.features },
    { href: homePath(locale, "how-it-works"), label: nav.howItWorks },
    { href: homePath(locale, "interview"), label: nav.interview },
    { href: homePath(locale, "pricing"), label: nav.pricing },
    { href: homePath(locale, "faq"), label: nav.faq },
    { href: storyPath(locale), label: nav.story },
  ]
}

export function SiteHeader({
  locale,
  nav,
}: {
  locale: Locale
  nav: LandingDictionary["nav"]
}) {
  const links = buildNavLinks(locale, nav)

  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Brand href={homePath(locale)} label={nav.home} />

        <nav aria-label="Main" className="hidden flex-1 lg:block">
          <ul className="flex items-center gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <LocaleSwitcher locale={locale} label={nav.switchLanguage} />
          <ThemeToggle label={nav.toggleTheme} />
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <a href={LOGIN_PATH}>{nav.login}</a>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <a href={LOGIN_PATH}>{nav.start}</a>
          </Button>
          <MobileNav
            links={links}
            menuLabel={nav.openMenu}
            loginLabel={nav.login}
            startLabel={nav.start}
          />
        </div>
      </div>
    </header>
  )
}
