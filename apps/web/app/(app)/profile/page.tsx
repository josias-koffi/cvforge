import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { PlusIcon } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { NewProfileCard, ProfileCard } from "@/components/profile/profile-card"
import { Button } from "@/components/ui/button"
import { loadRegistry } from "@/lib/profile"
import { requireSession } from "@/lib/session"

export const metadata: Metadata = { title: "Mes profils" }

/**
 * The profiles side by side, each summed up on a card; one opens in its own
 * page to be edited. Choosing and editing are two moments, and the editor no
 * longer has to share its width with the list.
 */
export default async function ProfilesPage(props: PageProps<"/profile">) {
  const { id } = await props.searchParams

  // Links from before the editor had its own page.
  if (typeof id === "string") redirect(`/profile/${encodeURIComponent(id)}`)

  const session = await requireSession()
  const registry = await loadRegistry(session.email)
  const canDelete = registry.profiles.length > 1

  return (
    <>
      <PageHeader
        title="Mes profils"
        description="Votre matière première : un profil par type de poste visé. Le profil par défaut sert à chaque génération."
        actions={
          <Button asChild>
            <Link href="/profile/new">
              <PlusIcon />
              Nouveau profil
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 px-4 md:grid-cols-2 lg:px-6 xl:grid-cols-3">
        {registry.profiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            canDelete={canDelete}
            isDefault={profile.id === registry.activeProfileId}
            profile={profile}
          />
        ))}
        <NewProfileCard />
      </div>
    </>
  )
}
