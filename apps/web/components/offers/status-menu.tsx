"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  applicationStatusTransitions,
  type ApplicationStatus,
} from "@cvforge/types"
import { ChevronDownIcon } from "lucide-react"
import { toast } from "sonner"

import { updateOfferStatus } from "@/app/(app)/candidatures/actions"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { statusLabels } from "@/lib/format"

export function StatusMenu({
  offerId,
  status,
}: {
  offerId: string
  status: ApplicationStatus
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const nextStatuses = applicationStatusTransitions[status] as readonly ApplicationStatus[]

  if (nextStatuses.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={pending}>
          {pending ? <Spinner /> : null}
          Changer le statut
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Passer à</DropdownMenuLabel>
        {nextStatuses.map((next) => (
          <DropdownMenuItem
            key={next}
            onSelect={() =>
              startTransition(async () => {
                const result = await updateOfferStatus(offerId, next)
                if (result.ok) {
                  toast.success(result.message)
                  router.refresh()
                } else {
                  toast.error(result.message)
                }
              })
            }
          >
            {statusLabels[next]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
