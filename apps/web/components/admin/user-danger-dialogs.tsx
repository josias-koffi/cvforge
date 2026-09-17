"use client"

import { useState } from "react"

import {
  deleteUser,
  revokeUserSessions,
  setUserStatus,
} from "@/app/(app)/admin/users/actions"
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useActionMutation } from "@/hooks/use-action-mutation"
import type { AdminUserRow } from "@/lib/admin"

type UserDialogProps = {
  onOpenChange: (open: boolean) => void
  open: boolean
  user: AdminUserRow
}

/** Suspension keeps the data and cuts the access, including live sessions. */
export function SuspendUserDialog({ onOpenChange, open, user }: UserDialogProps) {
  const [note, setNote] = useState("")
  const { pending, run } = useActionMutation(() => onOpenChange(false))
  const suspending = user.status === "active"

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {suspending ? "Suspendre" : "Réactiver"} {user.email} ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {suspending
              ? "Aucune donnée n'est supprimée. L'utilisateur est déconnecté immédiatement et ne peut plus demander de lien de connexion."
              : "L'utilisateur pourra à nouveau demander un lien de connexion. Les sessions déjà révoquées restent invalides."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="suspend-note">Note (optionnelle)</FieldLabel>
            <Input
              id="suspend-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Motif consigné dans le journal d'audit"
            />
          </Field>
        </FieldGroup>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            variant={suspending ? "destructive" : "default"}
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              run(() =>
                setUserStatus(
                  user.email,
                  suspending ? "suspended" : "active",
                  note.trim() || undefined
                )
              )
            }}
          >
            {pending ? <Spinner /> : null}
            {suspending ? "Suspendre" : "Réactiver"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function RevokeSessionsDialog({ onOpenChange, open, user }: UserDialogProps) {
  const { pending, run } = useActionMutation(() => onOpenChange(false))

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Déconnecter {user.email} ?</AlertDialogTitle>
          <AlertDialogDescription>
            Toutes les sessions ouvertes, sur tous les appareils, cessent de fonctionner
            immédiatement. Le compte reste actif et l&apos;utilisateur peut se reconnecter.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              run(() => revokeUserSessions(user.email))
            }}
          >
            {pending ? <Spinner /> : null}
            Déconnecter
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * Double confirmation: the admin retypes the address. The API checks it too —
 * this is the ergonomic guard, not the security one.
 */
export function DeleteUserDialog({ onOpenChange, open, user }: UserDialogProps) {
  const [confirmation, setConfirmation] = useState("")
  const [note, setNote] = useState("")
  const { pending, run } = useActionMutation(() => onOpenChange(false))
  const confirmed =
    confirmation.trim().toLowerCase() === user.email.trim().toLowerCase()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer {user.email} ?</AlertDialogTitle>
          <AlertDialogDescription>
            Le compte, les candidatures, les documents, le profil, les crédits, les
            entretiens et les notifications seront définitivement supprimés. Les achats
            déjà payés sont conservés, anonymisés, comme pièces comptables. Cette action
            est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="delete-confirmation">
              Saisissez l&apos;adresse email pour confirmer
            </FieldLabel>
            <Input
              id="delete-confirmation"
              autoComplete="off"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={user.email}
            />
            <FieldDescription>
              La suppression n&apos;est possible que si l&apos;adresse correspond.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="delete-note">Note (optionnelle)</FieldLabel>
            <Input
              id="delete-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Motif consigné dans le journal d'audit"
            />
          </Field>
        </FieldGroup>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending || !confirmed}
            onClick={(event) => {
              event.preventDefault()
              run(() =>
                deleteUser(user.email, confirmation.trim(), note.trim() || undefined)
              )
            }}
          >
            {pending ? <Spinner /> : null}
            Supprimer définitivement
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
