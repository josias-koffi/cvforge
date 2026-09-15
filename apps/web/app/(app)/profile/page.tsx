import type { Metadata } from "next"

import { PageHeader } from "@/components/layout/page-header"
import { ProfileForm } from "@/components/profile/profile-form"
import { loadActiveProfile } from "@/lib/profile"
import { requireSession } from "@/lib/session"

export const metadata: Metadata = { title: "Mon profil" }

export default async function ProfilePage() {
  const session = await requireSession()
  const { profile } = await loadActiveProfile(session.email)

  return (
    <>
      <PageHeader
        title="Mon profil"
        description="La matière première de l'IA : plus il est complet, plus vos CV et lettres sont pertinents."
      />
      <ProfileForm initialProfile={profile} />
    </>
  )
}
