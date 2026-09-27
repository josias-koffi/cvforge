"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { cn } from "cn"

export type TabNavItem = { href: string; icon: LucideIcon; label: string }

/**
 * Tabs that are pages: each one has its own URL, so a reload, a shared link
 * or the back button lands on the same tab. The tab is open when the path is
 * exactly its own — a query string (a page number, a filter) does not change it.
 */
export function TabNav({
  hrefFor = (href) => href,
  label,
  tabs,
}: {
  /** What each link carries along, such as the profile being looked at. */
  hrefFor?: (href: string) => string
  label: string
  tabs: readonly TabNavItem[]
}) {
  const pathname = usePathname()

  return (
    <nav
      aria-label={label}
      className="-mx-4 overflow-x-auto overflow-y-hidden border-b px-4 lg:-mx-6 lg:px-6"
    >
      <ul className="flex min-w-max gap-1">
        {tabs.map(({ href, icon: Icon, label: tabLabel }) => {
          const active = pathname === href

          return (
            <li key={href}>
              <Link
                href={hrefFor(href)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-10 items-center gap-2 px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                  "after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity",
                  active && "text-foreground after:opacity-100"
                )}
              >
                <Icon className="size-4" />
                {tabLabel}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
