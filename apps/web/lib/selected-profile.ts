import { loadRegistry } from "@/lib/profile"
import { pickProfile } from "@/lib/profile-model"
import { requireSession } from "@/lib/session"

/**
 * The profile a page is about: the one named by `?profileId`, else the
 * active one. Every "Ma recherche" tab starts the same way.
 */
export async function loadSelectedProfile(
  searchParams: Promise<Record<string, string | string[] | undefined>>
) {
  const session = await requireSession()
  const { profileId } = await searchParams
  const registry = await loadRegistry(session.email)

  return {
    registry,
    selected: pickProfile(
      registry,
      typeof profileId === "string" ? profileId : undefined
    ),
  }
}
