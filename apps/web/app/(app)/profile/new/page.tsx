import type { Metadata } from "next"

import { PageHeader } from "@/components/layout/page-header"
import { ProfileForm } from "@/components/profile/profile-form"
import { loadRegistry } from "@/lib/profile"
import { createEmptyProfile, pickProfile } from "@/lib/profile-model"
import { requireSession } from "@/lib/session"

export const metadata: Metadata = { title: "Nouveau profil" }

/**
 * A new profile is the editor on a blank one, stored at its first save. The
 * identity is taken from the default profile: it is the same person.
 */
export default async function NewProfilePage() {
  const session = await requireSession()
  const registry = await loadRegistry(session.email)
  const draft = createEmptyProfile(session.email, "Nouveau profil")
  draft.identity = { ...draft.identity, ...pickProfile(registry).identity }

  return (
    <>
      <PageHeader
        title="Nouveau profil"
        description="Importez un CV ou remplissez les sections, puis enregistrez : le profil n'existe qu'à partir de là."
      />
      <ProfileForm key={draft.id} initialProfile={draft} isNew />
    </>
  )
}
