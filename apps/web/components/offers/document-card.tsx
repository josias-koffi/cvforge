"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowRightIcon, RefreshCwIcon, SparklesIcon } from "lucide-react"

import { generateDocument, setOfferProfile } from "@/app/(app)/offers/actions"
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
  disabled?: boolean
  offerId: string
  title: string
}

export function DocumentRow({
  description,
  generatedAt,
  kind,
  disabled,
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
              disabled={disabled}
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
              disabled={disabled}
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
  selectedProfileId: string
}

/** CV and letter rows, generated from the profile remembered for this offer (the default one otherwise). */
export function OfferDocuments({
  cvGeneratedAt,
  defaultProfileId,
  letterGeneratedAt,
  offerId,
  profiles,
  selectedProfileId,
}: OfferDocumentsProps) {
  const [profileId, setProfileId] = useState(selectedProfileId)
  const [saving, startSaving] = useTransition()

  const chooseProfile = (nextId: string) => {
    const previousId = profileId
    setProfileId(nextId)
    startSaving(async () => {
      const result = await setOfferProfile(offerId, nextId)

      if (!result.ok) {
        setProfileId(previousId)
        toast.error(result.message)
      }
    })
  }

  return (
    <>
      {profiles.length > 1 ? (
        <Field>
          <FieldLabel htmlFor="generation-profile">Profil utilisé</FieldLabel>
          <Select value={profileId} onValueChange={chooseProfile} disabled={saving}>
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
        disabled={saving}
        title="CV"
        description="CV ciblé sur les attentes de l'offre."
        generatedAt={cvGeneratedAt}
      />
      <DocumentRow
        kind="letter"
        offerId={offerId}
        disabled={saving}
        title="Lettre de motivation"
        description="Lettre personnalisée pour l'entreprise."
        generatedAt={letterGeneratedAt}
      />
    </>
  )
}
