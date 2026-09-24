import Link from "next/link"
import {
  LA_BONNE_BOITE_SOURCE_LABEL,
  type HiringCompaniesView,
  type HiringCompany,
} from "@cvforge/types"
import { Building2Icon } from "lucide-react"

import { SpontaneousApplyButton } from "@/components/job-search/spontaneous-apply-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

const EMPTY_STATES = {
  no_location: {
    description:
      "Ajoutez une ville à votre recherche : nous chercherons les entreprises autour.",
    title: "Où cherchez-vous ?",
  },
  no_rome: {
    description:
      "Confirmez au moins un métier dans votre recherche : c'est par métier que France Travail sait qui recrute.",
    title: "Quel métier visez-vous ?",
  },
  pending: {
    description:
      "Votre recherche est prête. La liste arrive dans l'heure, puis se met à jour chaque semaine.",
    title: "Première lecture en cours",
  },
  ready: {
    description:
      "France Travail n'attend pas d'embauche dans vos métiers autour de vos villes. Élargissez le rayon ou ajoutez un métier voisin.",
    title: "Aucune entreprise pour l'instant",
  },
} as const

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
})

/**
 * "Entreprises qui recrutent" (US-119): the companies La Bonne Boîte expects
 * to hire in the candidate's jobs near their places, offer or not. Free, like
 * every France Travail datum (ADR-024 §3), and always credited.
 */
export function HiringCompanies({
  profileId,
  view,
}: {
  profileId: string
  view: HiringCompaniesView
}) {
  if (view.companies.length === 0) {
    const state = EMPTY_STATES[view.status]

    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Building2Icon />
          </EmptyMedia>
          <EmptyTitle>{state.title}</EmptyTitle>
          <EmptyDescription>{state.description}</EmptyDescription>
        </EmptyHeader>
        {view.status === "pending" ? null : (
          <EmptyContent>
            <Button asChild variant="outline">
              <Link href="/ma-recherche">Ma recherche</Link>
            </Button>
          </EmptyContent>
        )}
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {view.companies.length} entreprise
        {view.companies.length > 1 ? "s" : ""} susceptible
        {view.companies.length > 1 ? "s" : ""} d&apos;embaucher dans vos métiers,
        même sans offre publiée. Les premières ont le plus fort potentiel.
        Une candidature spontanée est gratuite à créer ; le CV et la lettre
        adaptés coûtent les crédits habituels.
      </p>
      <ul className="grid gap-3 md:grid-cols-2">
        {view.companies.map((company) => (
          <CompanyCard
            key={company.siret}
            company={company}
            profileId={profileId}
          />
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        {LA_BONNE_BOITE_SOURCE_LABEL}
        {view.refreshedAt
          ? `, lu le ${dateFormat.format(new Date(view.refreshedAt))}`
          : ""}
        . Gratuit.
      </p>
    </div>
  )
}

function CompanyCard({
  company,
  profileId,
}: {
  company: HiringCompany
  profileId: string
}) {
  const headcount = headcountText(company)

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-medium">{company.name}</h3>
        {company.highPotential ? (
          <Badge variant="secondary">Fort potentiel d&apos;embauche</Badge>
        ) : null}
      </div>
      {company.nafLabel ? (
        <p className="text-sm text-muted-foreground">{company.nafLabel}</p>
      ) : null}
      <p className="text-sm">
        {[company.city, headcount].filter(Boolean).join(" · ")}
      </p>
      <p className="text-xs text-muted-foreground">
        Recrute dans : {company.romeLabel}
      </p>
      <SpontaneousApplyButton
        profileId={profileId}
        siret={company.siret}
        companyName={company.name}
      />
    </li>
  )
}

function headcountText(company: HiringCompany): string {
  if (company.headcountMax === null) return ""
  if (company.headcountMin === company.headcountMax) {
    return `${company.headcountMax} salariés`
  }

  return `${company.headcountMin ?? 0} à ${company.headcountMax} salariés`
}
