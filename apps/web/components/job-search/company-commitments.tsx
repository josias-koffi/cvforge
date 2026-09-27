import { EGAPRO_SOURCE_LABEL, type CompanyBadge } from "@cvforge/types"

import { COMMITMENT_ICONS } from "@/components/job-search/company-badges"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * A company's public commitments (US-121), each as a tile with its icon: the
 * part of a company a candidate cannot read from its figures.
 */
export function CompanyCommitments({ badges }: { badges: CompanyBadge[] }) {
  const hasEgapro = badges.some((badge) => badge.key === "egapro")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Engagements</CardTitle>
        <CardDescription>
          Société à mission, ESS, entreprise inclusive, index égalité, bilan
          carbone : ce qu&apos;elle déclare publiquement.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {badges.length > 0 ? (
          <ul className="grid gap-2 @2xl/main:grid-cols-2">
            {badges.map((badge) => {
              const Icon = COMMITMENT_ICONS[badge.key]

              return (
                <li
                  key={badge.key}
                  className="flex items-center gap-3 rounded-lg border bg-success/5 px-3 py-2.5 text-sm"
                >
                  <Icon className="size-4 shrink-0 text-success" aria-hidden />
                  {badge.label}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucun engagement public relevé pour l&apos;instant.
          </p>
        )}
        {hasEgapro ? (
          <p className="text-xs text-muted-foreground">{EGAPRO_SOURCE_LABEL}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
