"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { UploadIcon } from "lucide-react"
import { toast } from "sonner"

import { saveProfile } from "@/app/(app)/profile/actions"
import { SectionOutline } from "@/components/layout/section-outline"
import { UnsavedChangesGuard } from "@/components/layout/unsaved-changes-guard"
import { CvDropzone } from "@/components/profile/cv-dropzone"
import { ProfileAvailabilityCard } from "@/components/profile/profile-availability-card"
import { useProfileEditState } from "@/components/profile/profile-edit-state"
import { ProfileIdentityCard } from "@/components/profile/profile-identity-card"
import { ProfileListCards } from "@/components/profile/profile-list-cards"
import { normalizeProfile } from "@/components/profile/normalize-profile"
import { ProfileSaveBar } from "@/components/profile/profile-save-bar"
import { profileOutline } from "@/components/profile/profile-sections"
import { ProfileSummaryCard } from "@/components/profile/profile-summary-card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { BaseProfile } from "@/lib/profile-model"

/** A profile with substance no longer needs the import zone to sit centre stage. */
function hasContent(profile: BaseProfile) {
  const { experiences, summary, technicalSkills } = profile.sections

  return Boolean(
    summary.trim() || experiences.length > 0 || technicalSkills.length > 0
  )
}

/**
 * One profile, edited as a single document and saved with one button.
 *
 * On a large screen the outline, the CV import and the save bar stay put;
 * only the section cards scroll between them. A section is a card rather than
 * a tab, so the whole profile can be read through, and the outline says which
 * ones are still empty. A new profile gets its own address at its first save.
 */
export function ProfileForm({
  initialProfile,
  isNew = false,
}: {
  initialProfile: BaseProfile
  /** Not stored yet: a draft that only exists once saved. */
  isNew?: boolean
}) {
  const router = useRouter()
  const [profile, setProfile] = useState(initialProfile)
  const [savedProfile, setSavedProfile] = useState(initialProfile)
  const [saving, startSaving] = useTransition()
  const dirty = JSON.stringify(profile) !== JSON.stringify(savedProfile)
  const { setDirty } = useProfileEditState()

  useEffect(() => setDirty(dirty), [dirty, setDirty])
  const filled = hasContent(profile)
  const setSection = <K extends keyof BaseProfile["sections"]>(
    key: K,
    value: BaseProfile["sections"][K]
  ) =>
    setProfile((current) => ({
      ...current,
      sections: { ...current.sections, [key]: value },
    }))

  const save = () =>
    startSaving(async () => {
      const normalized = normalizeProfile(profile)
      const result = await saveProfile(normalized)

      if (result.ok) {
        const saved = {
          ...normalized,
          meta: { ...normalized.meta, lastSavedAt: new Date().toISOString() },
        }
        setProfile(saved)
        setSavedProfile(saved)
        toast.success(result.message)
        if (isNew) router.replace(`/profile/${saved.id}`)
      } else {
        toast.error(result.message)
      }
    })

  return (
    <div className="grid gap-6 px-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[16rem_minmax(0,1fr)] lg:px-6">
      <UnsavedChangesGuard dirty={dirty} />
      <aside className="flex flex-col gap-6 lg:-mx-1 lg:min-h-0 lg:overflow-y-auto lg:px-1 lg:pb-1">
        <div className="hidden flex-col gap-2 lg:flex">
          <p className="px-2 text-xs font-medium text-muted-foreground uppercase">
            Sections du profil
          </p>
          <SectionOutline
            label="Sections du profil"
            items={profileOutline(profile)}
          />
        </div>
        {filled ? <ImportCvDialog onImported={setProfile} /> : null}
      </aside>

      <div className="@container/editor flex min-w-0 flex-col gap-4 lg:min-h-0">
        <div className="flex flex-col gap-4 *:shrink-0 lg:-mx-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-2 lg:pb-1">
          {filled ? null : (
            <CvDropzone compact={false} onImported={setProfile} />
          )}
          <ProfileIdentityCard profile={profile} onChange={setProfile} />
          <ProfileSummaryCard
            sections={profile.sections}
            setSection={setSection}
          />
          <ProfileListCards
            sections={profile.sections}
            setSection={setSection}
          />
          <ProfileAvailabilityCard
            preferences={profile.preferences}
            onChange={(preferences) =>
              setProfile((current) => ({ ...current, preferences }))
            }
          />
        </div>
        <ProfileSaveBar
          dirty={dirty}
          lastSavedAt={savedProfile.meta.lastSavedAt}
          saving={saving}
          onReset={() => setProfile(savedProfile)}
          onSave={save}
        />
      </div>
    </div>
  )
}

/** Once the profile is filled, importing another CV is a side action. */
function ImportCvDialog({
  onImported,
}: {
  onImported: (update: (profile: BaseProfile) => BaseProfile) => void
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <UploadIcon />
          Importer un CV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Importer un CV</DialogTitle>
          <DialogDescription>
            Chaque section trouvée dans le CV remplace la vôtre, les autres
            restent telles quelles. Rien n&apos;est enregistré avant que vous ne
            cliquiez sur « Enregistrer ».
          </DialogDescription>
        </DialogHeader>
        <CvDropzone compact={false} onImported={onImported} />
      </DialogContent>
    </Dialog>
  )
}
