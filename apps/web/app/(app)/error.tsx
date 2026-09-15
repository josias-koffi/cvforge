"use client"

import { useEffect } from "react"
import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <Empty className="mx-4 rise-in border bg-card shadow-surface lg:mx-6">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <TriangleAlertIcon />
        </EmptyMedia>
        <EmptyTitle>Le courant ne passe pas</EmptyTitle>
        <EmptyDescription>
          Un souci technique nous empêche d&apos;afficher cette page. Vos données sont
          intactes : réessayez dans un instant.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={() => retry()}>
          <RotateCcwIcon />
          Réessayer
        </Button>
      </EmptyContent>
    </Empty>
  )
}
