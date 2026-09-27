import Link from "next/link"
import {
  LA_BONNE_BOITE_SOURCE_LABEL,
  type HiringCompaniesView,
  type HiringCompany,
} from "@cvforge/types"
import {
  ArrowRightIcon,
  BriefcaseIcon,
  Building2Icon,
  MapPinIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react"

import { CompanyBadges } from "@/components/job-search/company-badges"
import { CompanyMark } from "@/components/job-search/company-mark"
import { MetaItem, MetaList } from "@/components/job-search/offer-meta"
import { PagePagination } from "@/components/data-table/page-pagination"
import { SpontaneousApplyButton } from "@/components/job-search/spontaneous-apply-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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

/** Companies per page: fills two or three columns without a gap. */
export const HIRING_COMPANIES_PAGE_SIZE = 24

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
  page = 1,
}: {
  profileId: string
  view: HiringCompaniesView
  /** 1-based; one past the end shows the last page. */
  page?: number
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

  const lastPage = Math.ceil(view.companies.length / HIRING_COMPANIES_PAGE_SIZE)
  const current = Math.min(Math.max(1, page), lastPage)
  const start = (current - 1) * HIRING_COMPANIES_PAGE_SIZE
  // The list comes whole and ranked: the pages only cut it.
  const shown = view.companies.slice(start, start + HIRING_COMPANIES_PAGE_SIZE)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {view.companies.length} entreprise
        {view.companies.length > 1 ? "s" : ""} susceptible
        {view.companies.length > 1 ? "s" : ""} d&apos;embaucher dans vos
        métiers, même sans offre publiée. Les premières ont le plus fort
        potentiel. Une candidature spontanée est gratuite à créer ; le CV et la
        lettre adaptés coûtent les crédits habituels.
      </p>
      {/* The offers' grid: the two lists read the same way. */}
      <ul className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
        {shown.map((company) => (
          <CompanyCard
            key={company.siret}
            company={company}
            profileId={profileId}
          />
        ))}
      </ul>
      {lastPage > 1 ? (
        <footer className="flex flex-col items-center gap-2">
          <PagePagination
            page={current}
            lastPage={lastPage}
            path="/entreprises"
            params={{ profileId }}
          />
          <p className="text-xs text-muted-foreground">
            {start + 1} à {start + shown.length} sur {view.companies.length}
          </p>
        </footer>
      ) : null}
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

/**
 * One company, built like an offer card: who, where, how big, for which job,
 * then the one action. The whole card opens the company's page.
 */
function CompanyCard({
  company,
  profileId,
}: {
  company: HiringCompany
  profileId: string
}) {
  const headcount = headcountText(company)

  return (
    <li>
      <Card className="relative h-full rise-in transition-[box-shadow,transform,border-color] duration-200 ease-spark [--card-spacing:--spacing(5)] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-raised">
        <CardContent className="flex h-full flex-col gap-4">
          <div className="flex items-center gap-3">
            <CompanyMark name={company.name} logoUrl={company.logoUrl} />
            <div className="flex min-w-0 flex-1 flex-col">
              <h3
                className="truncate text-base leading-snug font-semibold"
                title={company.name}
              >
                {company.name}
              </h3>
              {company.nafLabel ? (
                <p
                  className="truncate text-xs text-muted-foreground"
                  title={company.nafLabel}
                >
                  {company.nafLabel}
                </p>
              ) : null}
            </div>
          </div>

          {company.highPotential ? (
            <Badge variant="success" className="self-start">
              <TrendingUpIcon aria-hidden />
              Fort potentiel d&apos;embauche
            </Badge>
          ) : null}

          <MetaList>
            <MetaItem icon={MapPinIcon} label="Ville">
              {company.city}
            </MetaItem>
            {headcount ? (
              <MetaItem icon={UsersIcon} label="Effectif">
                {headcount}
              </MetaItem>
            ) : null}
            <MetaItem icon={BriefcaseIcon} label="Métier" wide>
              <span className="truncate" title={company.romeLabel}>
                Recrute dans : {company.romeLabel}
              </span>
            </MetaItem>
          </MetaList>

          <CompanyBadges badges={company.badges} />

          <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
            <span
              aria-hidden
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors group-hover/company:text-primary"
            >
              Voir la fiche
              <ArrowRightIcon className="size-3.5" />
            </span>
            <SpontaneousApplyButton
              className="relative z-10"
              profileId={profileId}
              siret={company.siret}
              companyName={company.name}
            />
          </div>

          {/* The whole card opens the company's page. An overlaid link rather
              than a wrapping one: a link cannot contain the apply button. */}
          <Link
            href={`/entreprises/${company.siret}?profileId=${profileId}`}
            className="absolute inset-0 rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span className="sr-only">Voir la fiche de {company.name}</span>
          </Link>
        </CardContent>
      </Card>
    </li>
  )
}

const count = new Intl.NumberFormat("fr-FR")

/** "1 000 à 1 999 salariés", or "" when France Travail does not know. */
export function headcountText(company: HiringCompany): string {
  if (company.headcountMax === null) return ""
  if (company.headcountMin === company.headcountMax) {
    return `${count.format(company.headcountMax)} salariés`
  }

  return `${count.format(company.headcountMin ?? 0)} à ${count.format(company.headcountMax)} salariés`
}
