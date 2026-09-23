import { emptySearchProject, type SearchProject } from "@cvforge/types"

import { api } from "@/lib/api"

/**
 * The search project attached to a profile: what the candidate is looking for.
 *
 * A profile that was never saved has no project either — the API would answer
 * 404 on an unknown profile id — so an empty one is returned instead of
 * failing the page.
 */
export async function loadSearchProject(profileId: string): Promise<SearchProject> {
  try {
    const { searchProject } = await api<{ searchProject: SearchProject }>(
      `/profiles/${encodeURIComponent(profileId)}/search-project`
    )

    return searchProject
  } catch {
    return emptySearchProject(profileId)
  }
}

export async function writeSearchProject(project: SearchProject) {
  const { searchProject } = await api<{ searchProject: SearchProject }>(
    `/profiles/${encodeURIComponent(project.profileId)}/search-project`,
    { body: { searchProject: project }, method: "PUT" }
  )

  return searchProject
}

export async function requestSearchProjectPrefill(profileId: string) {
  const { searchProject } = await api<{ searchProject: SearchProject }>(
    `/profiles/${encodeURIComponent(profileId)}/search-project/prefill`,
    { method: "POST" }
  )

  return searchProject
}
