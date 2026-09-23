import type { Metadata } from "next"

import { PageHeader } from "@/components/layout/page-header"
import { ProfileWorkspace } from "@/components/profile/profile-workspace"
import { loadRegistry } from "@/lib/profile"
import { pickProfile } from "@/lib/profile-model"
import { loadSearchProject } from "@/lib/search-project"
import { requireSession } from "@/lib/session"

export const metadata: Metadata = { title: "Mes profils" }

export default async function ProfilePage(props: PageProps<"/profile">) {
  const session = await requireSession()
  const { id } = await props.searchParams
  const registry = await loadRegistry(session.email)
  const selected = pickProfile(registry, typeof id === "string" ? id : undefined)
  const searchProject = await loadSearchProject(selected.id)

  return (
    <>
      <PageHeader
        title="Mes profils"
        description="Votre matière première : un profil par type de poste visé. Le profil par défaut sert à chaque génération."
      />
      <ProfileWorkspace
        activeProfileId={registry.activeProfileId}
        profiles={registry.profiles}
        searchProject={searchProject}
        selected={selected}
      />
    </>
  )
}
