"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  CopyIcon,
  MoreHorizontalIcon,
  StarIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import {
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
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useProfileEditState } from "@/components/profile/profile-edit-state"
import type { ActionResult } from "@/lib/api"

/**
 * What can be done to a whole profile, from its card in the list or from its
 * own page: make it the default, copy it, delete it. A copy opens at once; a
 * deleted profile sends back to the list.
 */
export function ProfileActionsMenu({
  canDelete,
  isDefault,
  label,
  profileId,
}: {
  canDelete: boolean
  isDefault: boolean
  label: string
  profileId: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  // A copy starts from the saved version: offering it over unsaved edits
  // would drop them without a word.
  const { dirty } = useProfileEditState()

  const run = (
    task: () => Promise<ActionResult & { profileId?: string }>,
    then: (result: { profileId?: string }) => void
  ) =>
    startTransition(async () => {
      const result = await task()

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      then(result)
    })

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative z-10 size-8"
            disabled={pending}
            aria-label={`Actions pour ${label}`}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={isDefault}
            onSelect={() =>
              run(
                () => setDefaultProfile(profileId),
                () => router.refresh()
              )
            }
          >
            <StarIcon />
            Définir par défaut
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={dirty}
            onSelect={() =>
              run(
                () => duplicateProfile(profileId),
                (result) =>
                  result.profileId &&
                  router.push(`/profile/${result.profileId}`)
              )
            }
          >
            <CopyIcon />
            {dirty ? "Dupliquer (enregistrez d'abord)" : "Dupliquer"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={!canDelete}
            onSelect={() => setConfirmDelete(true)}
          >
            <Trash2Icon />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {label} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le profil est définitivement supprimé. Les CV et lettres déjà
              générés sont conservés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                run(
                  () => deleteProfile(profileId),
                  () => {
                    router.push("/profile")
                    router.refresh()
                  }
                )
              }
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
