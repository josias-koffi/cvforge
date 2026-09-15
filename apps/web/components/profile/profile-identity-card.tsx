"use client"

import { useRef, useTransition } from "react"
import { FileUpIcon, SaveIcon } from "lucide-react"
import { toast } from "sonner"

import { importCvFile } from "@/app/(app)/profile/actions"
import { FieldGrid, SpecField, type FieldSpec } from "@/components/documents/list-editor"
import { PendingContent, sparkClassName } from "@/components/feedback/pending-content"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { creditCostLabel, formatDateTime } from "@/lib/format"
import { applyImportedCv, type BaseProfile } from "@/lib/profile-model"

type Identity = BaseProfile["identity"]
type ProfileUpdater = (update: (profile: BaseProfile) => BaseProfile) => void

const identityFields: FieldSpec<Identity>[] = [
  { key: "firstName", label: "Prénom" },
  { key: "lastName", label: "Nom" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Téléphone" },
  { key: "city", label: "Ville" },
  { key: "linkedIn", label: "LinkedIn" },
  { key: "github", label: "GitHub" },
  { key: "portfolio", label: "Portfolio" },
]

function CvImportCard({ onImported }: { onImported: ProfileUpdater }) {
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importer un CV existant</CardTitle>
        <CardDescription>
          Déposez votre CV (PDF ou DOCX, 5 Mo max.) : ce profil se remplit tout seul.
          Vérifiez puis enregistrez. {creditCostLabel("cv_import")}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          action={(formData) =>
            startTransition(async () => {
              const response = await importCvFile(formData)

              if (!response.ok) {
                toast.error(response.message)
                return
              }

              onImported((profile) => applyImportedCv(profile, response.result.extractedProfile))
              toast.success("CV lu : vérifiez les champs puis enregistrez.", { className: "spark" })
              if (inputRef.current) inputRef.current.value = ""
            })
          }
        >
          <Input
            ref={inputRef}
            name="cvFile"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            aria-label="Fichier CV"
            required
          />
          <Button
            type="submit"
            variant="spark"
            className={sparkClassName(pending)}
            disabled={pending}
          >
            <PendingContent pending={pending} pendingLabel="Analyse en cours…" spark>
              <FileUpIcon />
              Analyser mon CV
            </PendingContent>
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function ProfileIdentityCard({
  onChange,
  onSave,
  profile,
  saving,
}: {
  onChange: ProfileUpdater
  onSave: () => void
  profile: BaseProfile
  saving: boolean
}) {
  return (
    <div className="grid gap-4 @5xl/editor:grid-cols-[1fr_340px]">
      <Card>
        <CardHeader>
          <CardTitle>Identité</CardTitle>
          <CardDescription>
            Nom, e-mail et téléphone ne sont jamais envoyés à l&apos;IA : ils sont
            réinjectés après la génération.
          </CardDescription>
          <CardAction>
            <Button onClick={onSave} disabled={saving}>
              {saving ? <Spinner /> : <SaveIcon />}
              Enregistrer
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FieldGrid>
            <SpecField
              id="profile"
              spec={{ key: "label", label: "Nom du profil" }}
              value={profile.label}
              onChange={(value) => onChange((current) => ({ ...current, label: value as string }))}
            />
            <SpecField
              id="profile"
              spec={{ key: "headline", label: "Titre professionnel" }}
              value={profile.headline}
              onChange={(value) => onChange((current) => ({ ...current, headline: value as string }))}
            />
          </FieldGrid>
          <FieldGrid>
            {identityFields.map((spec) => (
              <SpecField
                key={spec.key}
                id="identity"
                spec={spec}
                value={profile.identity[spec.key]}
                onChange={(value) =>
                  onChange((current) => ({
                    ...current,
                    identity: { ...current.identity, [spec.key]: value },
                  }))
                }
              />
            ))}
          </FieldGrid>
        </CardContent>
      </Card>
      <div className="flex flex-col gap-4">
        <CvImportCard onImported={onChange} />
        <Card>
          <CardHeader>
            <CardDescription>Dernier enregistrement</CardDescription>
            <CardTitle className="text-base">{formatDateTime(profile.meta.lastSavedAt)}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
