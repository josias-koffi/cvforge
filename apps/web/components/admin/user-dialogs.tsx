"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CopyIcon, UserPlusIcon } from "lucide-react"
import { toast } from "sonner"

import {
  deleteUser,
  grantUserCredits,
  inviteUser,
  updateUserRole,
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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import type { ActionResult } from "@/lib/api"
import type { AdminUserRow } from "@/lib/admin"

type Role = AdminUserRow["role"]

function useMutation(onDone: () => void) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const run = (task: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const result = await task()
      if (result.ok) {
        toast.success(result.message)
        onDone()
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })

  return { pending, run }
}

function RoleSelect({ id, onChange, value }: { id: string; onChange: (role: Role) => void; value: Role }) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as Role)}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="user">Utilisateur</SelectItem>
        <SelectItem value="admin">Administrateur</SelectItem>
      </SelectContent>
    </Select>
  )
}

export function InviteUserDialog() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Role>("user")
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const reset = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setEmail("")
      setRole("user")
      setInvitationUrl(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button>
          <UserPlusIcon />
          Inviter un utilisateur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un utilisateur</DialogTitle>
          <DialogDescription>
            Un lien d&apos;invitation valable 48 h est généré, à transmettre à la personne.
          </DialogDescription>
        </DialogHeader>
        {invitationUrl ? (
          <Field>
            <FieldLabel htmlFor="invitation-url">Lien d&apos;invitation</FieldLabel>
            <div className="flex gap-2">
              <Input id="invitation-url" readOnly value={invitationUrl} />
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(invitationUrl)
                    .then(() => toast.success("Lien copié."))
                }
              >
                <CopyIcon />
                <span className="sr-only">Copier</span>
              </Button>
            </div>
          </Field>
        ) : (
          <form
            id="invite-form"
            onSubmit={(event) => {
              event.preventDefault()
              startTransition(async () => {
                const result = await inviteUser(email.trim(), role)
                if (result.ok && result.invitationUrl) {
                  setInvitationUrl(result.invitationUrl)
                } else if (!result.ok) {
                  toast.error(result.message)
                }
              })
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="invite-email">E-mail</FieldLabel>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="invite-role">Rôle</FieldLabel>
                <RoleSelect id="invite-role" value={role} onChange={setRole} />
              </Field>
            </FieldGroup>
          </form>
        )}
        <DialogFooter>
          {invitationUrl ? (
            <Button onClick={() => reset(false)}>Terminer</Button>
          ) : (
            <Button type="submit" form="invite-form" disabled={pending}>
              {pending ? <Spinner /> : null}
              Générer l&apos;invitation
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type UserDialogProps = {
  onOpenChange: (open: boolean) => void
  open: boolean
  user: AdminUserRow
}

export function EditRoleDialog({ onOpenChange, open, user }: UserDialogProps) {
  const [role, setRole] = useState<Role>(user.role)
  const { pending, run } = useMutation(() => onOpenChange(false))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le rôle</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="edit-role">Rôle</FieldLabel>
          <RoleSelect id="edit-role" value={role} onChange={setRole} />
          <FieldDescription>
            Le changement s&apos;applique à la prochaine connexion de l&apos;utilisateur.
          </FieldDescription>
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            disabled={pending || role === user.role}
            onClick={() => run(() => updateUserRole(user.email, role))}
          >
            {pending ? <Spinner /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function GrantCreditsDialog({ onOpenChange, open, user }: UserDialogProps) {
  const [credits, setCredits] = useState("50")
  const [note, setNote] = useState("")
  const { pending, run } = useMutation(() => onOpenChange(false))
  const amount = Number.parseInt(credits, 10)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter des crédits</DialogTitle>
          <DialogDescription>
            {user.email} · solde actuel : {user.balance}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="grant-credits">Nombre de crédits</FieldLabel>
            <Input
              id="grant-credits"
              type="number"
              min={1}
              value={credits}
              onChange={(event) => setCredits(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="grant-note">Note (obligatoire)</FieldLabel>
            <Input
              id="grant-note"
              placeholder="Démo, geste commercial…"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            disabled={pending || !Number.isInteger(amount) || amount <= 0 || !note.trim()}
            onClick={() => run(() => grantUserCredits(user.email, amount, note.trim()))}
          >
            {pending ? <Spinner /> : null}
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DeleteUserDialog({ onOpenChange, open, user }: UserDialogProps) {
  const { pending, run } = useMutation(() => onOpenChange(false))

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer {user.email} ?</AlertDialogTitle>
          <AlertDialogDescription>
            Le compte, les candidatures, les documents, le profil, les crédits et les
            notifications de cet utilisateur seront définitivement supprimés.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              run(() => deleteUser(user.email))
            }}
          >
            {pending ? <Spinner /> : null}
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
