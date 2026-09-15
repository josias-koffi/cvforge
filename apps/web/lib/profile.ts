import { api } from "@/lib/api"
import {
  createEmptyProfile,
  type BaseProfile,
  type ProfileRegistry,
} from "@/lib/profile-model"

/** Loads the user's profiles; a first visit gets an unsaved empty profile. */
export async function loadRegistry(email: string): Promise<ProfileRegistry> {
  const { registry } = await api<{ registry: ProfileRegistry | null }>("/profiles")

  if (registry && registry.profiles.length > 0) {
    return registry
  }

  const profile = createEmptyProfile(email)
  return { activeProfileId: profile.id, profiles: [profile], version: 2 }
}

export async function writeRegistry(profiles: BaseProfile[], activeProfileId: string) {
  await api("/profiles", {
    body: { registry: { activeProfileId, profiles, version: 2 } },
    method: "PUT",
  })
}
