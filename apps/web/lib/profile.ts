import { api } from "@/lib/api"
import {
  createEmptyProfile,
  type BaseProfile,
  type ProfileRegistry,
} from "@/lib/profile-model"

/** The v2 UI edits a single profile: the registry's active one. */
export async function loadActiveProfile(email: string) {
  const { registry } = await api<{ registry: ProfileRegistry | null }>("/profiles")
  const profile =
    registry?.profiles.find((item) => item.id === registry.activeProfileId) ??
    registry?.profiles[0]

  return { profile: profile ?? createEmptyProfile(email), registry }
}

export async function saveActiveProfile(
  profile: BaseProfile,
  registry: ProfileRegistry | null
) {
  const saved: BaseProfile = {
    ...profile,
    meta: { ...profile.meta, lastSavedAt: new Date().toISOString(), source: "storage" },
  }
  const others = (registry?.profiles ?? []).filter((item) => item.id !== saved.id)

  await api("/profiles", {
    body: {
      registry: { activeProfileId: saved.id, profiles: [saved, ...others], version: 2 },
    },
    method: "PUT",
  })
}

