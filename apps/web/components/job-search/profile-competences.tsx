"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { ROME_SOURCE_LABEL, type ProfileRomeCompetence } from "@cvforge/types"
import { PencilIcon, X } from "lucide-react"
import { toast } from "sonner"

import { dismissProfileCompetence } from "@/app/(app)/ma-recherche/actions"
import { SearchChip } from "@/components/job-search/search-chip"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardAction,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"

/** ROME's competence types, as a candidate would name them. */
const GROUPS = [
  {
    label: "Savoir-faire",
    types: ["COMPETENCE-DETAILLEE", "MACRO-SAVOIR-FAIRE"],
  },
  { label: "Savoir-être", types: ["MACRO-SAVOIR-ETRE-PROFESSIONNEL"] },
] as const
const KNOWLEDGE = "Connaissances"

/**
 * "Vos compétences": what ROMEO read in the CV when the profile was saved
 * (US-125). They are inferred, not typed, so the candidate removes the wrong
 * ones — "Docker" was once read as "Doctorat" — and a removed one never comes
 * back. Each click applies at once, like the job chips.
 */
export function ProfileCompetences({
  profileId,
  initialCompetences,
}: {
  profileId: string
  initialCompetences: ProfileRomeCompetence[]
}) {
  const [competences, setCompetences] = useState(initialCompetences)
  const [pending, startRemoving] = useTransition()

  const remove = (code: string) =>
    startRemoving(async () => {
      const result = await dismissProfileCompetence(profileId, code)

      if (result.ok) setCompetences(result.competences)
      else toast.error(result.message)
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vos compétences</CardTitle>
        <CardDescription>
          Repérées dans votre CV à chaque enregistrement du profil. Retirez
          celles qui ne vous correspondent pas : elles ne reviendront plus.
        </CardDescription>
        <CardAction>
          <Button asChild size="sm" variant="ghost">
            <Link href="/profile">
              <PencilIcon />
              Modifier mon profil
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <CompetenceGroups
          competences={competences}
          disabled={pending}
          onRemove={remove}
        />
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">{ROME_SOURCE_LABEL}</p>
      </CardFooter>
    </Card>
  )
}

export function CompetenceGroups({
  competences,
  disabled,
  onRemove,
}: {
  competences: ProfileRomeCompetence[]
  disabled: boolean
  onRemove: (code: string) => void
}) {
  if (competences.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Enregistrez{" "}
        <Link href="/profile" className="underline underline-offset-4">
          votre profil
        </Link>{" "}
        avec ses compétences et ses réalisations : nous y repérerons vos
        compétences.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {groupByType(competences).map(({ label, entries }) => (
        <div key={label} className="flex flex-col gap-2">
          <Label>{label}</Label>
          <ul className="flex flex-wrap gap-2">
            {entries.map((entry) => (
              <SearchChip
                key={entry.code}
                disabled={disabled}
                actions={[
                  {
                    icon: X,
                    label: `Retirer ${entry.libelle}`,
                    onClick: () => onRemove(entry.code),
                  },
                ]}
              >
                {entry.libelle}
              </SearchChip>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

/** Savoir-faire first, then savoir-être, then the rest as knowledge. */
function groupByType(competences: ProfileRomeCompetence[]) {
  const named = GROUPS.map(({ label, types }) => ({
    entries: competences.filter((entry) =>
      (types as readonly string[]).includes(entry.type)
    ),
    label,
  }))
  const grouped = new Set(named.flatMap(({ entries }) => entries))

  return [
    ...named,
    {
      entries: competences.filter((entry) => !grouped.has(entry)),
      label: KNOWLEDGE,
    },
  ].filter(({ entries }) => entries.length > 0)
}
