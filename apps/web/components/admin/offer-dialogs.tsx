"use client"

import type { AdminCreditOffer } from "@cvforge/types"
import { useState } from "react"
import { PlusIcon, RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"

import {
  archiveOffer,
  createOffer,
  syncOffersWithStripe,
  updateOffer,
} from "@/app/(app)/admin/offers/actions"
import { OfferFormFields } from "@/components/admin/offer-form-fields"
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
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { useActionMutation } from "@/hooks/use-action-mutation"
import {
  buildOfferInput,
  emptyOfferForm,
  offerToForm,
  type CreditOfferFormValues,
} from "@/lib/credit-offer-form"

type OfferDialogProps = {
  offer: AdminCreditOffer | null
  onOpenChange: (open: boolean) => void
  open: boolean
}

/** Create (`offer` null) or edit an offer. */
export function OfferDialog({ offer, onOpenChange, open }: OfferDialogProps) {
  const [values, setValues] = useState<CreditOfferFormValues>(() =>
    offer ? offerToForm(offer) : emptyOfferForm()
  )
  const { pending, run } = useActionMutation(() => onOpenChange(false))

  const submit = () => {
    const result = buildOfferInput(values)

    if (!result.ok) {
      toast.error(result.message)
      return
    }

    run(() => (offer ? updateOffer(offer.id, result.input) : createOffer(result.input)))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{offer ? `Modifier « ${offer.name.fr} »` : "Nouvelle offre"}</DialogTitle>
          <DialogDescription>
            Les textes sont affichés sur la landing et la page Crédits, dans la langue du visiteur.
            Un changement de prix crée un nouveau prix Stripe ; les achats passés gardent le leur.
          </DialogDescription>
        </DialogHeader>
        <form
          id="offer-form"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <OfferFormFields isNew={!offer} values={values} onChange={setValues} />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="offer-form" disabled={pending}>
            {pending ? <Spinner /> : null}
            {offer ? "Enregistrer" : "Créer l'offre"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CreateOfferButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon />
        Nouvelle offre
      </Button>
      {open ? <OfferDialog open offer={null} onOpenChange={setOpen} /> : null}
    </>
  )
}

export function SyncStripeButton() {
  const { pending, run } = useActionMutation(() => undefined)

  return (
    <Button variant="outline" disabled={pending} onClick={() => run(syncOffersWithStripe)}>
      {pending ? <Spinner /> : <RefreshCwIcon />}
      Synchroniser Stripe
    </Button>
  )
}

export function ArchiveOfferDialog({
  offer,
  onOpenChange,
  open,
}: OfferDialogProps & { offer: AdminCreditOffer }) {
  const { pending, run } = useActionMutation(() => onOpenChange(false))

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archiver « {offer.name.fr} » ?</AlertDialogTitle>
          <AlertDialogDescription>
            L&apos;offre disparaît du site et de la page Crédits, et son produit Stripe est
            désactivé. Les achats et crédits existants ne changent pas. Vous pourrez la remettre en
            vente en modifiant son statut.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              run(() => archiveOffer(offer.id))
            }}
          >
            {pending ? <Spinner /> : null}
            Archiver
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
