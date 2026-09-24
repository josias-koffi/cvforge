import Link from "next/link"
import { FileTextIcon, ZapIcon } from "lucide-react"

import { generateDocument } from "@/app/(app)/candidatures/actions"
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
    <Empty className="mx-4 w-auto rise-in border bg-card shadow-surface lg:mx-6">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-primary/10 text-primary motion-safe:animate-float">
          <FileTextIcon />
        </EmptyMedia>
        <EmptyTitle>Pas encore de {label}</EmptyTitle>
        <EmptyDescription>
          Un premier jet ciblé sur l&apos;offre, à partir de votre profil, en quelques
          secondes. Vous l&apos;ajustez ensuite ici.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center">
        <ActionButton
          spark
          pendingLabel="Génération en cours…"
          action={generateDocument.bind(null, offerId, kind, undefined)}
        >
          <ZapIcon />
          {kind === "cv" ? "Générer mon CV" : "Générer ma lettre"}
        </ActionButton>
        <Button asChild variant="outline">
          <Link href={`/candidatures/${offerId}`}>Retour à la candidature</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}
