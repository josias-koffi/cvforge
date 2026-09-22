"use client"

import { useState } from "react"
import { DownloadIcon, Trash2Icon } from "lucide-react"

import { deleteOwnAccount } from "@/app/(app)/compte/actions"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useActionMutation } from "@/hooks/use-action-mutation"

export function ExportDataCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Exporter mes données</CardTitle>
        <CardDescription>
          Un fichier JSON contenant votre profil, vos candidatures, vos crédits et
          vos notifications. C&apos;est votre droit d&apos;accès et de portabilité.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button variant="outline" asChild>
          <a href="/api/privacy/export" download>
            <DownloadIcon />
            Télécharger l&apos;export
          </a>
        </Button>
      </CardFooter>
    </Card>
  )
}

export function DeleteAccountCard({ email }: { email: string }) {
  const [open, setOpen] = useState(false)

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle>Supprimer mon compte</CardTitle>
        <CardDescription>
          Votre profil, vos candidatures, vos entretiens et vos notifications sont
          effacés immédiatement. Les crédits non consommés sont perdus. Cette action
          est irréversible.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Vos commandes payées sont conservées comme pièces comptables, sans votre
        identité — voir la politique de confidentialité.
      </CardContent>
      <CardFooter>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          <Trash2Icon />
          Supprimer mon compte
        </Button>
      </CardFooter>
      <DeleteAccountDialog email={email} open={open} onOpenChange={setOpen} />
    </Card>
  )
}

/** Typing the address back is the confirmation the API itself requires. */
function DeleteAccountDialog({
  email,
  open,
  onOpenChange,
}: {
  email: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [confirmation, setConfirmation] = useState("")
  const { pending, run } = useActionMutation(() => onOpenChange(false))
  const matches = confirmation.trim().toLowerCase() === email.toLowerCase()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer définitivement ce compte ?</AlertDialogTitle>
          <AlertDialogDescription>
            Tout est effacé immédiatement, sans possibilité de retour.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field>
          <FieldLabel htmlFor="confirmation">
            Saisissez {email} pour confirmer
          </FieldLabel>
          <Input
            id="confirmation"
            value={confirmation}
            autoComplete="off"
            onChange={(event) => setConfirmation(event.target.value)}
          />
          <FieldDescription>
            La vérification est refaite côté serveur.
          </FieldDescription>
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!matches || pending}
            onClick={() => run(() => deleteOwnAccount(confirmation))}
          >
            {pending ? <Spinner /> : <Trash2Icon />}
            Supprimer
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
