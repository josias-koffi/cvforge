"use client"

import {
  FieldGrid,
  SpecField,
  type FieldSpec,
} from "@/components/documents/list-editor"
import { SectionCard } from "@/components/layout/section-card"
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
    <SectionCard
      id="identite"
      title="Identité"
      description="Nom, e-mail et téléphone ne sont jamais envoyés à l'IA : ils sont réinjectés après la génération."
    >
      <FieldGrid>
        <SpecField
          id="profile"
          spec={{ key: "label", label: "Nom du profil" }}
          value={profile.label}
          onChange={(value) =>
            onChange((current) => ({ ...current, label: value as string }))
          }
        />
        <SpecField
          id="profile"
          spec={{ key: "headline", label: "Titre professionnel" }}
          value={profile.headline}
          onChange={(value) =>
            onChange((current) => ({ ...current, headline: value as string }))
          }
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
    </SectionCard>
  )
}
