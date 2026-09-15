import Link from "next/link"
import { FileTextIcon, SparklesIcon } from "lucide-react"

import { generateDocument } from "@/app/(app)/offers/actions"
import { ActionButton } from "@/components/feedback/action-button"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export function MissingDocument({
  kind,
  offerId,
}: {
  kind: "cv" | "letter"
  offerId: string
}) {
  const label = kind === "cv" ? "CV" : "lettre de motivation"

  return (
    <Empty className="mx-4 border lg:mx-6">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileTextIcon />
        </EmptyMedia>
        <EmptyTitle>Pas encore de {label}</EmptyTitle>
        <EmptyDescription>
          L&apos;IA rédige un premier jet à partir de votre profil et de l&apos;offre,
          que vous pourrez ensuite ajuster ici.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center">
        <ActionButton pendingLabel="L'IA rédige…" action={generateDocument.bind(null, offerId, kind, undefined)}>
          <SparklesIcon />
          Générer avec l&apos;IA
        </ActionButton>
        <Button asChild variant="outline">
          <Link href={`/offers/${offerId}`}>Retour à l&apos;offre</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}
