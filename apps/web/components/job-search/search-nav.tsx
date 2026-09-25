"use client"

import { useSearchParams } from "next/navigation"

import { SEARCH_TABS, searchTabHref } from "@/components/job-search/search-tabs"
import { TabNav } from "@/components/layout/tab-nav"

export function SearchNav() {
  const profileId = useSearchParams().get("profileId")

  return (
    <TabNav
      label="Ma recherche"
      tabs={SEARCH_TABS}
      hrefFor={(href) => searchTabHref(href, profileId)}
    />
  )
}
