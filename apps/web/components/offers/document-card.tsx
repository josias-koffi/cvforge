"use client"

import Link from "next/link"
import { ArrowRightIcon, RefreshCwIcon, SparklesIcon } from "lucide-react"

import { generateDocument } from "@/app/(app)/offers/actions"
import { ActionButton } from "@/components/feedback/action-button"
import { Button } from "@/components/ui/button"
import { formatDateTime } from "@/lib/format"

type DocumentRowProps = {
  description: string
  generatedAt: string | null | undefined
  kind: "cv" | "letter"
  offerId: string
  title: string
}

export function DocumentRow({
  description,
  generatedAt,
  kind,
  offerId,
  title,
}: DocumentRowProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div>
        <div className="font-medium">{title}</div>
        <p className="text-sm text-muted-foreground">
          {generatedAt ? `Généré le ${formatDateTime(generatedAt)}` : description}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {generatedAt ? (
          <>
            <Button asChild size="sm">
              <Link href={`/offers/${offerId}/${kind}`}>
                Ouvrir l&apos;éditeur
                <ArrowRightIcon />
              </Link>
            </Button>
            <ActionButton
              size="sm"
              variant="outline"
              pendingLabel="Génération…"
              action={() => generateDocument(offerId, kind)}
            >
              <RefreshCwIcon />
              Régénérer
            </ActionButton>
          </>
        ) : (
          <ActionButton
            size="sm"
            pendingLabel="L'IA rédige…"
            action={() => generateDocument(offerId, kind)}
          >
            <SparklesIcon />
            Générer avec l&apos;IA
          </ActionButton>
        )}
      </div>
    </div>
  )
}
