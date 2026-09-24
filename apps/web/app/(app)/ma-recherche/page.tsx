import type { Metadata } from "next"

import { SearchProjectForm } from "@/components/job-search/search-project-form"
import { loadSearchProject } from "@/lib/search-project"
import { loadSelectedProfile } from "@/lib/selected-profile"

export const metadata: Metadata = { title: "Ma recherche · Critères" }

/**
 * A page of its own, not a tab inside the profile editor: the search feeds the
 * daily offers, and it is edited at other moments, for other reasons.
 */
export default async function SearchCriteriaPage(
  props: PageProps<"/ma-recherche">
) {
  const { selected } = await loadSelectedProfile(props.searchParams)
  const { searchProject } = await loadSearchProject(selected.id)

  return <SearchProjectForm key={selected.id} initialProject={searchProject} />
}
