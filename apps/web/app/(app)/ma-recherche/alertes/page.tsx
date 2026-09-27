import type { Metadata } from "next"

import { SearchProjectAlerts } from "@/components/job-search/search-project-alerts"
import { SearchTabBody } from "@/components/job-search/search-tab-body"
import { loadSearchProject, pickAlerts } from "@/lib/search-project"
import { loadSelectedProfile } from "@/lib/selected-profile"

export const metadata: Metadata = { title: "Ma recherche · Alertes" }

/** The morning selection: whether it comes, how, and what it is built from. */
export default async function SearchAlertsPage(
  props: PageProps<"/ma-recherche/alertes">
) {
  const { selected } = await loadSelectedProfile(props.searchParams)
  const { searchProject, rome } = await loadSearchProject(selected.id)

  return (
    <SearchTabBody>
      <SearchProjectAlerts
        key={selected.id}
        profileId={selected.id}
        initialAlerts={pickAlerts(searchProject)}
        project={searchProject}
        confirmedJobs={
          rome.filter((entry) => entry.status === "confirmed").length
        }
      />
    </SearchTabBody>
  )
}
