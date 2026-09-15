"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRightIcon, RefreshCwIcon, SparklesIcon } from "lucide-react"

import { generateDocument } from "@/app/(app)/offers/actions"
import { ActionButton } from "@/components/feedback/action-button"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDateTime } from "@/lib/format"

type DocumentRowProps = {
  description: string
  generatedAt: string | null | undefined
  kind: "cv" | "letter"
  offerId: string
  profileId?: string
  title: string
}

export function DocumentRow({
  description,
  generatedAt,
  kind,
  offerId,
  profileId,
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
              action={() => generateDocument(offerId, kind, undefined, profileId)}
            >
              <RefreshCwIcon />
              Régénérer
            </ActionButton>
          </>
        ) : (
          <ActionButton
            size="sm"
            pendingLabel="L'IA rédige…"
            action={() => generateDocument(offerId, kind, undefined, profileId)}
          >
            <SparklesIcon />
            Générer avec l&apos;IA
          </ActionButton>
        )}
      </div>
    </div>
  )
}

export type ProfileOption = { id: string; label: string }

type OfferDocumentsProps = {
  cvGeneratedAt: string | null | undefined
  defaultProfileId: string
  letterGeneratedAt: string | null | undefined
  offerId: string
  profiles: ProfileOption[]
}

/** CV and letter rows, generated from the profile picked here (the default one otherwise). */
export function OfferDocuments({
  cvGeneratedAt,
  defaultProfileId,
  letterGeneratedAt,
  offerId,
  profiles,
}: OfferDocumentsProps) {
  const [profileId, setProfileId] = useState(defaultProfileId)

  return (
    <>
      {profiles.length > 1 ? (
        <Field>
          <FieldLabel htmlFor="generation-profile">Profil utilisé</FieldLabel>
          <Select value={profileId} onValueChange={setProfileId}>
            <SelectTrigger id="generation-profile" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.label}
                  {profile.id === defaultProfileId ? " (par défaut)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}
      <DocumentRow
        kind="cv"
        offerId={offerId}
        profileId={profileId}
        title="CV"
        description="CV ciblé sur les attentes de l'offre."
        generatedAt={cvGeneratedAt}
      />
      <DocumentRow
        kind="letter"
        offerId={offerId}
        profileId={profileId}
        title="Lettre de motivation"
        description="Lettre personnalisée pour l'entreprise."
        generatedAt={letterGeneratedAt}
      />
    </>
  )
}
