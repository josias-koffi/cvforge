"use client"

import { FieldGrid, SpecField, type FieldSpec } from "@/components/documents/list-editor"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { BaseProfile } from "@/lib/profile-model"

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

export function ProfileIdentityCard({
  onChange,
  profile,
}: {
  onChange: ProfileUpdater
  profile: BaseProfile
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Identité</CardTitle>
        <CardDescription>
          Nom, e-mail et téléphone ne sont jamais envoyés à l&apos;IA : ils sont
          réinjectés après la génération.
        </CardDescription>
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
        <FieldGrid columns={3}>
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
  )
}
