import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/layout/page-header"
import { ProfileActionsMenu } from "@/components/profile/profile-actions-menu"
import { ProfileEditState } from "@/components/profile/profile-edit-state"
import { ProfileForm } from "@/components/profile/profile-form"
import { Badge } from "@/components/ui/badge"
import { loadRegistry } from "@/lib/profile"
import { candidateName } from "@/lib/profile-model"
import { requireSession } from "@/lib/session"

export const metadata: Metadata = { title: "Modifier le profil" }

export default async function ProfileEditPage(
  props: PageProps<"/profile/[id]">
) {
  const session = await requireSession()
  const { id } = await props.params
  const registry = await loadRegistry(session.email)
  const profile = registry.profiles.find((item) => item.id === id)

  if (!profile) notFound()

  const isDefault = profile.id === registry.activeProfileId
  const label = profile.label || "Profil sans nom"

  return (
    <ProfileEditState>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {label}
            {isDefault ? <Badge>Par défaut</Badge> : null}
          </span>
        }
        description={
          [candidateName(profile), profile.headline]
            .filter(Boolean)
            .join(" · ") || "Identité à compléter"
        }
        actions={
          <ProfileActionsMenu
            canDelete={registry.profiles.length > 1}
            isDefault={isDefault}
            label={label}
            profileId={profile.id}
          />
        }
      />
      <ProfileForm key={profile.id} initialProfile={profile} />
    </ProfileEditState>
  )
}
