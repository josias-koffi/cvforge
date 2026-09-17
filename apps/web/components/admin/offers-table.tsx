"use client"

import type { AdminCreditOffer } from "@cvforge/types"
import { useState } from "react"
import {
  ArchiveIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  StarIcon,
} from "lucide-react"

import { featureOffer } from "@/app/(app)/admin/offers/actions"
import { ArchiveOfferDialog, OfferDialog } from "@/components/admin/offer-dialogs"
import { TableFrame } from "@/components/data-table/table-frame"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useActionMutation } from "@/hooks/use-action-mutation"
import { offerStatusLabels, offerStatusVariants } from "@/lib/credit-offer-form"
import { formatCredits, formatDateTime, formatPrice } from "@/lib/format"

type DialogState = { kind: "edit" | "archive"; offer: AdminCreditOffer } | null

function StripeStatus({ offer }: { offer: AdminCreditOffer }) {
  if (offer.stripePriceId) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="success">Synchronisée</Badge>
        </TooltipTrigger>
        <TooltipContent>
          {offer.stripePriceId} · {formatDateTime(offer.stripeSyncedAt)}
        </TooltipContent>
      </Tooltip>
    )
  }

  return <Badge variant="warning">À synchroniser</Badge>
}

function OfferActions({
  offer,
  onOpen,
}: {
  offer: AdminCreditOffer
  onOpen: (state: NonNullable<DialogState>) => void
}) {
  const { pending, run } = useActionMutation(() => undefined)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" disabled={pending}>
          <EllipsisVerticalIcon />
          <span className="sr-only">Actions pour {offer.name.fr}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => onOpen({ kind: "edit", offer })}>
          <PencilIcon />
          Modifier
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={offer.status !== "active" || offer.isFeatured}
          onSelect={() => run(() => featureOffer(offer.id))}
        >
          <StarIcon />
          Mettre en avant
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={offer.status === "archived"}
          onSelect={() => onOpen({ kind: "archive", offer })}
        >
          <ArchiveIcon />
          Archiver
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function OffersTable({ offers }: { offers: AdminCreditOffer[] }) {
  const [dialog, setDialog] = useState<DialogState>(null)
  const close = (open: boolean) => {
    if (!open) setDialog(null)
  }

  return (
    <>
      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>Offre</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Crédits</TableHead>
            <TableHead className="text-right">Prix TTC</TableHead>
            <TableHead className="text-right">Ordre</TableHead>
            <TableHead>Stripe</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                Aucune offre pour l&apos;instant.
              </TableCell>
            </TableRow>
          ) : (
            offers.map((offer) => (
              <TableRow key={offer.id}>
                <TableCell>
                  <div className="flex items-center gap-2 font-medium">
                    {offer.name.fr}
                    {offer.isFeatured ? (
                      <Badge variant="spark">
                        <StarIcon />
                        Mise en avant
                      </Badge>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {offer.slug} · {offer.features.fr.length} fonctionnalité
                    {offer.features.fr.length > 1 ? "s" : ""}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={offerStatusVariants[offer.status]}>
                    {offerStatusLabels[offer.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCredits(offer.credits)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPrice(offer.priceCents)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{offer.sortOrder}</TableCell>
                <TableCell>
                  <StripeStatus offer={offer} />
                </TableCell>
                <TableCell className="text-right">
                  <OfferActions offer={offer} onOpen={setDialog} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </TableFrame>
      {dialog?.kind === "edit" ? (
        <OfferDialog open offer={dialog.offer} onOpenChange={close} />
      ) : null}
      {dialog?.kind === "archive" ? (
        <ArchiveOfferDialog open offer={dialog.offer} onOpenChange={close} />
      ) : null}
    </>
  )
}
