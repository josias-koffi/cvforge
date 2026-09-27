import type { Metadata } from "next"

import { ProfileCompetences } from "@/components/job-search/profile-competences"
import { SearchProjectRome } from "@/components/job-search/search-project-rome"
import { SearchTabBody } from "@/components/job-search/search-tab-body"
import { loadProfileCompetences } from "@/lib/profile-competences"
import { loadSearchProject } from "@/lib/search-project"
import { loadSelectedProfile } from "@/lib/selected-profile"

export const metadata: Metadata = { title: "Ma recherche · Métiers" }

/**
 * What France Travail's referential reads in the candidate's words: the jobs
 * behind their titles, the skills behind their CV. Every click here applies
 * at once — there is nothing to save.
 */
export default async function SearchJobsPage(
  props: PageProps<"/ma-recherche/metiers">
) {
  const { selected } = await loadSelectedProfile(props.searchParams)
  const [{ rome }, competences] = await Promise.all([
    loadSearchProject(selected.id),
    loadProfileCompetences(selected.id),
  ])

  return (
    <SearchTabBody className="flex flex-col gap-4">
      <SearchProjectRome
        key={`rome-${selected.id}`}
        profileId={selected.id}
        initialAppellations={rome}
      />
      <ProfileCompetences
        key={`competences-${selected.id}`}
        profileId={selected.id}
        initialCompetences={competences}
      />
    </SearchTabBody>
  )
}
