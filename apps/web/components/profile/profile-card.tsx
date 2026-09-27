import Link from "next/link"
import { CircleCheckIcon, PlusIcon } from "lucide-react"

import { ProfileActionsMenu } from "@/components/profile/profile-actions-menu"
import { profileOutline } from "@/components/profile/profile-sections"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDateTime } from "@/lib/format"
import { candidateName, type BaseProfile } from "@/lib/profile-model"

/**
 * One profile in the list: who it presents, how complete it is and what is
 * left to fill — enough to choose which one to open. The whole card opens it;
 * the menu in its corner acts on it without opening it.
 */
export function ProfileCard({
  canDelete,
  isDefault,
  profile,
}: {
  canDelete: boolean
  isDefault: boolean
  profile: BaseProfile
}) {
  const sections = profileOutline(profile)
  const filled = sections.filter(({ done }) => done)
  const missing = sections.filter(({ done }) => !done)
  const label = profile.label || "Profil sans nom"
  const { experiences, softSkills, technicalSkills } = profile.sections

  return (
    <Card className="relative transition-colors hover:border-primary/40">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Link
            href={`/profile/${profile.id}`}
            className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
          >
            {label}
          </Link>
          {isDefault ? <Badge>Par défaut</Badge> : null}
        </CardTitle>
        <CardDescription className="truncate">
          {[candidateName(profile), profile.headline]
            .filter(Boolean)
            .join(" · ") || "Identité à compléter"}
        </CardDescription>
        <CardAction>
          <ProfileActionsMenu
            canDelete={canDelete}
            isDefault={isDefault}
            label={label}
            profileId={profile.id}
          />
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">
              {filled.length}/{sections.length} sections remplies
            </span>
            <span className="text-muted-foreground">
              {experiences.length} exp. ·{" "}
              {technicalSkills.length + softSkills.length} compétences
            </span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Sections remplies"
            aria-valuemin={0}
            aria-valuemax={sections.length}
            aria-valuenow={filled.length}
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(filled.length / sections.length) * 100}%` }}
            />
          </div>
        </div>
        {missing.length === 0 ? (
          <p className="flex items-center gap-1.5 text-xs text-success">
            <CircleCheckIcon className="size-3.5" />
            Profil complet
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            À compléter : {missing.map(({ label: name }) => name).join(", ")}
          </p>
        )}
      </CardContent>

      <CardFooter className="mt-auto text-xs text-muted-foreground">
        {profile.meta.lastSavedAt
          ? `Enregistré le ${formatDateTime(profile.meta.lastSavedAt)}`
          : "Jamais enregistré"}
      </CardFooter>
    </Card>
  )
}

/** The last tile of the list: a new profile opens straight in the editor. */
export function NewProfileCard() {
  return (
    <Link
      href="/profile/new"
      className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center transition-colors outline-none hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-muted">
        <PlusIcon className="size-4" />
      </span>
      <span className="text-sm font-medium">Nouveau profil</span>
      <span className="max-w-xs text-xs text-muted-foreground">
        Un profil par type de poste visé : « Développeur back-end », « Tech lead
        »…
      </span>
    </Link>
  )
}
