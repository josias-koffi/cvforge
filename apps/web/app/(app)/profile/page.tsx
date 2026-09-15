import type { Metadata } from "next"

import { PageHeader } from "@/components/layout/page-header"
import { ProfileWorkspace } from "@/components/profile/profile-workspace"
import { loadRegistry } from "@/lib/profile"
import { pickProfile } from "@/lib/profile-model"
import { requireSession } from "@/lib/session"

export const metadata: Metadata = { title: "Mes profils" }

export default async function ProfilePage(props: PageProps<"/profile">) {
  const session = await requireSession()
  const { id } = await props.searchParams
  const registry = await loadRegistry(session.email)
  const selected = pickProfile(registry, typeof id === "string" ? id : undefined)

  return (
    <>
      <PageHeader
        title="Mes profils"
        description="La matière première de l'IA : un profil par type de poste visé. Le profil par défaut est proposé à la génération."
      />
      <ProfileWorkspace
        activeProfileId={registry.activeProfileId}
        profiles={registry.profiles}
        selected={selected}
      />
    </>
  )
}
