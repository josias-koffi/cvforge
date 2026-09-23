"use client"

import { UnlinkIcon } from "lucide-react"

import { detachListing } from "@/app/(app)/admin/job-search/actions"
import { TableFrame } from "@/components/data-table/table-frame"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useActionMutation } from "@/hooks/use-action-mutation"
import { formatDate } from "@/lib/format"
import type { FuzzyMerge } from "@/lib/job-boards"
import { SOURCE_LABELS } from "@/lib/job-labels"

/**
 * The merges that needed judgement, newest first.
 *
 * Everything else was decided by a shared link or an exact key and needs no
 * review; only the approximate ones can be wrong, and only a human can say so.
 */
export function MergesTable({ merges }: { merges: FuzzyMerge[] }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Deux annonces rapprochées par ressemblance — intitulé, description et
        date — et non par un lien commun. Séparez celles qui ne sont pas la même
        offre : l&apos;annonce redevient une offre à part entière.
      </p>

      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>Offre</TableHead>
            <TableHead>Annonces rapprochées</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {merges.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={3}
                className="h-24 text-center text-muted-foreground"
              >
                Aucun rapprochement approximatif récent.
              </TableCell>
            </TableRow>
          ) : (
            merges.map((merge) => (
              <TableRow key={merge.job.id}>
                <TableCell className="font-medium">
                  {merge.job.title}
                  <span className="block text-xs text-muted-foreground">
                    {merge.job.companyName || "Entreprise non communiquée"}
                    {merge.job.locationLabel ? ` · ${merge.job.locationLabel}` : ""}
                  </span>
                </TableCell>
                <TableCell>
                  <ul className="flex flex-col gap-2">
                    {merge.listings.map((listing) => (
                      <li key={listing.id} className="flex flex-col gap-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">
                            {SOURCE_LABELS[listing.source] ?? listing.source}
                          </Badge>
                          <span className="text-sm">{listing.title}</span>
                          {listing.matchMethod === "fuzzy" ? (
                            <Badge variant="outline">par ressemblance</Badge>
                          ) : null}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {listing.companyName || "Entreprise non communiquée"}
                          {listing.publishedAt
                            ? ` · publiée le ${formatDate(listing.publishedAt)}`
                            : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </TableCell>
                <TableCell className="align-top text-right">
                  <div className="flex flex-col items-end gap-1">
                    {merge.listings
                      .filter((listing) => listing.matchMethod === "fuzzy")
                      .map((listing) => (
                        <DetachButton key={listing.id} listingId={listing.id} />
                      ))}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </TableFrame>
    </div>
  )
}

function DetachButton({ listingId }: { listingId: string }) {
  const { pending, run } = useActionMutation(() => {})

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => run(() => detachListing(listingId))}
    >
      {pending ? <Spinner /> : <UnlinkIcon />}
      Séparer
    </Button>
  )
}
