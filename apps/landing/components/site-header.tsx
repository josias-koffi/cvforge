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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { FeaturePagesDictionary } from "@/content/feature-pages/types"
import type { LandingDictionary } from "@/content/types"
import { atsPath } from "@/lib/ats"
import { featurePages } from "@/lib/features"
import { homePath, storyPath, type Locale } from "@/lib/i18n"
import { LOGIN_PATH } from "@/lib/links"
import { toolsPath } from "@/lib/tools"

/** The feature pages, in the registry's order (US-147). */
export function buildFeatureLinks(
  locale: Locale,
  features: FeaturePagesDictionary
): NavLink[] {
  return featurePages.map(({ key, path }) => ({
    href: path(locale),
    label: features.pages[key].card.name,
  }))
}

/**
 * Every other destination, in reading order.
 *
 * The footer and the mobile sheet show this list whole — they have the room,
 * and a complete list is exactly what someone scrolling to the bottom wants.
 * Only the desktop header, where so many links became noise, groups them.
 */
export function buildNavLinks(
  locale: Locale,
  nav: LandingDictionary["nav"]
): NavLink[] {
  return [
    { href: homePath(locale, "features"), label: nav.features },
    { href: homePath(locale, "how-it-works"), label: nav.howItWorks },
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
 * The features menu opens on the four feature pages, each named and pitched
 * in a line, with what one reads before deciding underneath. Two destinations
 * stay in the open because they are what a visitor comes to decide on: the
 * price, and the free tools that are the top of the funnel.
 */
function buildHeaderNav(locale: Locale, nav: LandingDictionary["nav"]) {
  return {
    secondary: [
      { href: homePath(locale, "features"), label: nav.features },
      { href: homePath(locale, "how-it-works"), label: nav.howItWorks },
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
  features,
}: {
  locale: Locale
  nav: LandingDictionary["nav"]
  features: FeaturePagesDictionary
}) {
  const links = [
    ...buildFeatureLinks(locale, features),
    ...buildNavLinks(locale, nav),
  ]
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
                <DropdownMenuContent align="start" className="w-[36rem] p-2">
                  <div className="grid grid-cols-2 gap-1">
                    {featurePages.map(({ key, path, icon: Icon }) => (
                      <DropdownMenuItem
                        asChild
                        key={key}
                        className="items-start gap-3 rounded-lg p-3"
                      >
                        <Link href={path(locale)}>
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                            <Icon
                              className="size-4.5"
                              strokeWidth={1.75}
                              aria-hidden
                            />
                          </span>
                          <span className="flex flex-col gap-0.5">
                            <span className="font-medium">
                              {features.pages[key].card.name}
                            </span>
                            <span className="text-xs whitespace-normal text-muted-foreground">
                              {features.pages[key].card.description}
                            </span>
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </div>
                  <DropdownMenuSeparator className="my-2" />
                  <div className="flex flex-wrap gap-1">
                    {header.secondary.map((link) => (
                      <DropdownMenuItem
                        asChild
                        key={link.href}
                        className="text-muted-foreground"
                      >
                        <Link href={link.href}>{link.label}</Link>
                      </DropdownMenuItem>
                    ))}
                  </div>
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
