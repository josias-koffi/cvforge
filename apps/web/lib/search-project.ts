import {
  emptySearchProject,
  type RomeAppellationOption,
  type SearchProject,
  type SearchProjectRomeAppellation,
} from "@cvforge/types"

import { api } from "@/lib/api"

/** The project, and the ROME jobs attached to it (US-118). */
export type SearchProjectPage = {
  searchProject: SearchProject
  rome: SearchProjectRomeAppellation[]
}

function searchProjectPath(profileId: string) {
  return `/profiles/${encodeURIComponent(profileId)}/search-project`
}

/**
 * The search project attached to a profile: what the candidate is looking for.
 *
 * A profile that was never saved has no project either — the API would answer
 * 404 on an unknown profile id — so an empty one is returned instead of
 * failing the page.
 */
export async function loadSearchProject(
  profileId: string
): Promise<SearchProjectPage> {
  try {
    return await readSearchProject(profileId)
  } catch {
    return { rome: [], searchProject: emptySearchProject(profileId) }
  }
}

/**
 * The stored project, failing when it cannot be read: what a partial save is
 * merged onto, where an empty stand-in would wipe the rest.
 */
export function readSearchProject(profileId: string) {
  return api<SearchProjectPage>(searchProjectPath(profileId))
}

/** Saving is what asks ROMEO for suggestions, so the answer carries them. */
export function writeSearchProject(project: SearchProject) {
  return api<SearchProjectPage>(searchProjectPath(project.profileId), {
    body: { searchProject: project },
    method: "PUT",
  })
}

export async function writeRomeDecision(
  profileId: string,
  code: string,
  decision: "confirm" | "dismiss"
) {
  const { rome } = await api<{ rome: SearchProjectRomeAppellation[] }>(
    `${searchProjectPath(profileId)}/rome/${encodeURIComponent(code)}`,
    { method: decision === "confirm" ? "PUT" : "DELETE" }
  )

  return rome
}

/** Searched in CVForge's own copy of the referential, never at France Travail. */
export async function searchRomeAppellations(query: string) {
  const { appellations } = await api<{ appellations: RomeAppellationOption[] }>(
    "/rome/appellations",
    { query: { q: query } }
  )

  return appellations
}

export async function requestSearchProjectPrefill(profileId: string) {
  const { searchProject } = await api<{ searchProject: SearchProject }>(
    `${searchProjectPath(profileId)}/prefill`,
    { method: "POST" }
  )

  return searchProject
}

/**
 * The morning alerts: kept on the search project, but set from their own tab.
 * Neither tab may write back what the other one owns.
 */
export type SearchAlerts = Pick<
  SearchProject,
  "aiRerankEnabled" | "digestEnabled" | "emailEnabled"
>

export function pickAlerts(project: SearchAlerts): SearchAlerts {
  return {
    aiRerankEnabled: project.aiRerankEnabled,
    digestEnabled: project.digestEnabled,
    emailEnabled: project.emailEnabled,
  }
}
