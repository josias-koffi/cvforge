"use client"

import { useState } from "react"

import { ProfileForm } from "@/components/profile/profile-form"
import { ProfileList } from "@/components/profile/profile-list"
import type { BaseProfile } from "@/lib/profile-model"

/** Profile list and editor side by side; the list asks before dropping unsaved edits. */
export function ProfileWorkspace({
  activeProfileId,
  profiles,
  selected,
}: {
  activeProfileId: string
  profiles: BaseProfile[]
  selected: BaseProfile
}) {
  const [dirty, setDirty] = useState(false)

  return (
    <div className="grid items-start gap-4 px-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-6">
      <ProfileList
        activeProfileId={activeProfileId}
        dirty={dirty}
        profiles={profiles}
        selectedId={selected.id}
      />
      <ProfileForm key={selected.id} initialProfile={selected} onDirtyChange={setDirty} />
    </div>
  )
}
