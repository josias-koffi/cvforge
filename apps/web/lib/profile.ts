import { createHash } from "node:crypto"

import { api } from "@/lib/api"
import {
  createEmptyProfile,
  type BaseProfile,
  type ProfileRegistry,
} from "@/lib/profile-model"

/**
 * Identity of the starter profile a user gets before their first save.
 *
 * It has to be stable per user. `createEmptyProfile` mints a fresh uuid, and
 * the editor is mounted with `key={profile.id}`, so a new id on every render
 * remounts the form and throws away whatever was typed — or imported. That is
 * what emptied the fields right after a CV import: the import revalidates the
 * layout to refresh the credit balance it just debited, the page re-rendered,
 * and the starter profile came back with a different id.
 */
export function unsavedProfileId(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex")
    .slice(0, 32)
}

/** Loads the user's profiles; a first visit gets an unsaved empty profile. */
export async function loadRegistry(email: string): Promise<ProfileRegistry> {
  const { registry } = await api<{ registry: ProfileRegistry | null }>("/profiles")

  if (registry && registry.profiles.length > 0) {
    return registry
  }

  const profile: BaseProfile = {
    ...createEmptyProfile(email),
    id: unsavedProfileId(email),
  }

  return { activeProfileId: profile.id, profiles: [profile], version: 2 }
}

export async function writeRegistry(profiles: BaseProfile[], activeProfileId: string) {
  await api("/profiles", {
    body: { registry: { activeProfileId, profiles, version: 2 } },
    method: "PUT",
  })
}
