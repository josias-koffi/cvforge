"use client"

import { useState, useTransition } from "react"
import { CopyIcon, UserPlusIcon } from "lucide-react"
import { toast } from "sonner"

import {
  demoteUser,
  grantUserCredits,
  inviteUser,
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { useActionMutation } from "@/hooks/use-action-mutation"
import type { AdminUserRow } from "@/lib/admin"

type Role = AdminUserRow["role"]

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

/**
 * Demotion only. The admin role is granted exclusively through the nominative
 * invitation link (`InviteUserDialog`), never from this table — see vision §3.2.
 */
export function DemoteUserDialog({ onOpenChange, open, user }: UserDialogProps) {
  const { pending, run } = useActionMutation(() => onOpenChange(false))

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rétrograder en utilisateur ?</AlertDialogTitle>
          <AlertDialogDescription>
            {user.email} perdra l&apos;accès à l&apos;administration. Le rôle administrateur ne
            peut être réaccordé que par un nouveau lien d&apos;invitation nominatif. La
            rétrogradation s&apos;applique à la prochaine connexion de l&apos;utilisateur.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              run(() => demoteUser(user.email))
            }}
          >
            {pending ? <Spinner /> : null}
            Rétrograder
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function GrantCreditsDialog({ onOpenChange, open, user }: UserDialogProps) {
  const [credits, setCredits] = useState("50")
  const [note, setNote] = useState("")
  const { pending, run } = useActionMutation(() => onOpenChange(false))
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
