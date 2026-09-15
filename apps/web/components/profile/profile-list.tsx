"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  CopyIcon,
  MoreHorizontalIcon,
  PlusIcon,
  StarIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import {
  createProfile,
  deleteProfile,
  duplicateProfile,
  setDefaultProfile,
} from "@/app/(app)/profile/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import type { ActionResult } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  candidateName,
  countCompletedSections,
  PROFILE_SECTION_COUNT,
  type BaseProfile,
} from "@/lib/profile-model"

type ProfileListProps = {
  activeProfileId: string
  dirty: boolean
  profiles: BaseProfile[]
  selectedId: string
}

export function ProfileList({ activeProfileId, dirty, profiles, selectedId }: ProfileListProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)
  const [creating, setCreating] = useState(false)
  const [newLabel, setNewLabel] = useState("")
  const [toDelete, setToDelete] = useState<BaseProfile | null>(null)

  /** Runs a navigation now, or after confirmation when the editor has unsaved changes. */
  const guard = (navigate: () => void) => (dirty ? setPendingNavigation(() => navigate) : navigate())
  const open = (id: string) => router.push(`/profile?id=${id}`)

  const run = (task: () => Promise<ActionResult & { profileId?: string }>, onDone?: () => void) =>
    startTransition(async () => {
      const result = await task()

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      onDone?.()
      if (result.profileId) open(result.profileId)
      else router.refresh()
    })

  return (
    <aside className="flex flex-col gap-2">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => guard(() => setCreating(true))}
      >
        <PlusIcon />
        Nouveau profil
      </Button>
      <ul className="flex flex-col gap-1" aria-label="Mes profils">
        {profiles.map((profile) => {
          const selected = profile.id === selectedId
          const isDefault = profile.id === activeProfileId

          return (
            <li
              key={profile.id}
              className={cn(
                "group flex items-start gap-1 rounded-lg border border-transparent p-1 transition-colors hover:bg-muted/60",
                selected && "border-border bg-muted"
              )}
            >
              <button
                type="button"
                aria-current={selected ? "page" : undefined}
                className="flex min-w-0 flex-1 flex-col gap-1 rounded-md px-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => !selected && guard(() => open(profile.id))}
              >
                <span className="truncate text-sm font-medium">{profile.label || "Sans nom"}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {candidateName(profile) || "Identité à compléter"}
                </span>
                <span className="flex flex-wrap gap-1">
                  {isDefault ? <Badge>Par défaut</Badge> : null}
                  <Badge variant="outline">
                    {countCompletedSections(profile)}/{PROFILE_SECTION_COUNT} sections
                  </Badge>
                </span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions pour ${profile.label}`}>
                    <MoreHorizontalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    disabled={isDefault}
                    onSelect={() => run(() => setDefaultProfile(profile.id))}
                  >
                    <StarIcon />
                    Définir par défaut
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => guard(() => run(() => duplicateProfile(profile.id)))}
                  >
                    <CopyIcon />
                    Dupliquer
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={profiles.length <= 1}
                    onSelect={() => setToDelete(profile)}
                  >
                    <Trash2Icon />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          )
        })}
      </ul>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau profil</DialogTitle>
            <DialogDescription>
              Un profil par type de poste visé (ex. « Développeur back-end », « Tech lead »).
              Votre identité est reprise du profil par défaut.
            </DialogDescription>
          </DialogHeader>
          <form
            id="create-profile"
            onSubmit={(event) => {
              event.preventDefault()
              run(() => createProfile(newLabel), () => {
                setCreating(false)
                setNewLabel("")
              })
            }}
          >
            <Field>
              <FieldLabel htmlFor="profile-label">Nom du profil</FieldLabel>
              <Input
                id="profile-label"
                autoFocus
                required
                value={newLabel}
                onChange={(event) => setNewLabel(event.target.value)}
              />
            </Field>
          </form>
          <DialogFooter>
            <Button type="submit" form="create-profile" disabled={pending}>
              {pending ? <Spinner /> : null}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={toDelete !== null} onOpenChange={(value) => !value && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {toDelete?.label} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le profil est définitivement supprimé. Les CV et lettres déjà générés sont conservés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const target = toDelete
                if (!target) return
                run(() => deleteProfile(target.id), () => {
                  if (target.id === selectedId) router.push("/profile")
                })
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingNavigation !== null}
        onOpenChange={(value) => !value && setPendingNavigation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifications non enregistrées</AlertDialogTitle>
            <AlertDialogDescription>
              Le profil en cours contient des modifications non enregistrées. Elles seront
              perdues si vous continuez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Rester</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                pendingNavigation?.()
                setPendingNavigation(null)
              }}
            >
              Continuer sans enregistrer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  )
}
