import { ChevronDownIcon } from "lucide-react"
import Link from "next/link"

import { Brand } from "@/components/brand"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { MobileNav, type NavLink } from "@/components/mobile-nav"
import { ThemeToggle } from "@/components/theme"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { LandingDictionary } from "@/content/types"
import { atsPath } from "@/lib/ats"
import { homePath, storyPath, type Locale } from "@/lib/i18n"
import { LOGIN_PATH } from "@/lib/links"
import { toolsPath } from "@/lib/tools"

/**
 * Every destination, in reading order.
 *
 * The footer and the mobile sheet show this list whole — they have the room,
 * and a complete list is exactly what someone scrolling to the bottom wants.
 * Only the desktop header, where seven links became noise, groups them.
 */
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
    { href: toolsPath(locale), label: nav.tools },
    { href: atsPath(locale), label: nav.ats },
    { href: storyPath(locale), label: nav.story },
  ]
}

/**
 * What the desktop header shows.
 *
 * Two destinations stay in the open because they are what a visitor comes to
 * decide on: the price, and the free tools that are the top of the funnel —
 * burying them in a menu would defeat the pages they lead to. The hub rather
 * than the ATS check itself, since there is more than one tool to come; the
 * Hero and the closing call to action still link the check directly (US-134).
 * The rest is what you read *before* deciding, and sits one click away.
 */
function buildHeaderNav(locale: Locale, nav: LandingDictionary["nav"]) {
  return {
    grouped: [
      { href: homePath(locale, "features"), label: nav.features },
      { href: homePath(locale, "how-it-works"), label: nav.howItWorks },
      { href: homePath(locale, "interview"), label: nav.interview },
      { href: homePath(locale, "faq"), label: nav.faq },
      { href: storyPath(locale), label: nav.story },
    ],
    visible: [
      { href: homePath(locale, "pricing"), label: nav.pricing },
      { href: toolsPath(locale), label: nav.tools },
    ],
  }
}

export function SiteHeader({
  locale,
  nav,
}: {
  locale: Locale
  nav: LandingDictionary["nav"]
}) {
  const links = buildNavLinks(locale, nav)
  const header = buildHeaderNav(locale, nav)

  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Brand href={homePath(locale)} label={nav.home} />

        <nav aria-label="Main" className="hidden flex-1 lg:block">
          <ul className="flex items-center gap-1">
            <li>
              <DropdownMenu>
                <DropdownMenuTrigger className="group/nav flex items-center gap-1 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {nav.product}
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="size-4 transition-transform group-data-open/nav:rotate-180"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {header.grouped.map((link) => (
                    <DropdownMenuItem asChild key={link.href}>
                      <Link href={link.href}>{link.label}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
            {header.visible.map((link) => (
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
