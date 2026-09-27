import type { Metadata } from "next"

import { MarketRadar } from "@/components/job-search/market-radar"
import { SearchTabBody } from "@/components/job-search/search-tab-body"
import { loadMarketRadar } from "@/lib/market"
import { loadSelectedProfile } from "@/lib/selected-profile"

export const metadata: Metadata = { title: "Ma recherche · Marché" }

/** Read-only: the public figures for the confirmed jobs, refreshed monthly. */
export default async function SearchMarketPage(
  props: PageProps<"/ma-recherche/marche">
) {
  const { selected } = await loadSelectedProfile(props.searchParams)
  const entries = await loadMarketRadar(selected.id)

  return (
    <SearchTabBody>
      <MarketRadar entries={entries} profileId={selected.id} />
    </SearchTabBody>
  )
}
