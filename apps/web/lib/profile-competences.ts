import type { ProfileRomeCompetence } from "@cvforge/types"

import { api } from "@/lib/api"

function competencesPath(profileId: string) {
  return `/profiles/${encodeURIComponent(profileId)}/rome-competences`
}

/**
 * The ROME competences read in the profile's CV (US-125). A profile never
 * saved has none — the API answers 404 on it — so an empty list, not an error.
 */
export async function loadProfileCompetences(
  profileId: string
): Promise<ProfileRomeCompetence[]> {
  try {
    const { competences } = await api<{
      competences: ProfileRomeCompetence[]
    }>(competencesPath(profileId))

    return competences
  } catch {
    return []
  }
}

export async function writeCompetenceDismissal(
  profileId: string,
  code: string
) {
  const { competences } = await api<{ competences: ProfileRomeCompetence[] }>(
    `${competencesPath(profileId)}/${encodeURIComponent(code)}`,
    { method: "DELETE" }
  )

  return competences
}
