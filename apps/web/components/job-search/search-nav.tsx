"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "cn"

import { SEARCH_TABS, searchTabHref } from "@/components/job-search/search-tabs"

export function SearchNav() {
  const pathname = usePathname()
  const profileId = useSearchParams().get("profileId")

  return (
    <nav
      aria-label="Ma recherche"
      className="-mx-4 overflow-x-auto overflow-y-hidden border-b px-4 lg:-mx-6 lg:px-6"
    >
      <ul className="flex min-w-max gap-1">
        {SEARCH_TABS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href

          return (
            <li key={href}>
              <Link
                href={searchTabHref(href, profileId)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-10 items-center gap-2 px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                  "after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity",
                  active && "text-foreground after:opacity-100"
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
