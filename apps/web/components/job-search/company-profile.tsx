import {
  COMPANY_CATEGORY_LABELS,
  COMPANY_SOURCE_LABEL,
  EGAPRO_SOURCE_LABEL,
  EMPLOYER_PAGE_SOURCE_LABEL,
  LA_BONNE_BOITE_SOURCE_LABEL,
  type CompanyProfile,
  type HiringCompanyDetail,
} from "@cvforge/types"
import { ExternalLinkIcon } from "lucide-react"

import { CompanyBadges } from "@/components/job-search/company-badges"
import { headcountText } from "@/components/job-search/hiring-companies"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDate } from "@/lib/format"

const euros = new Intl.NumberFormat("fr-FR", {
  currency: "EUR",
  maximumFractionDigits: 1,
  notation: "compact",
  style: "currency",
})

/**
 * A company's page (US-121): the establishment La Bonne Boîte lists, the
 * company behind it from the Annuaire des entreprises, and its commitments.
 * Every figure says where it comes from.
 */
export function CompanyProfileView({ detail }: { detail: HiringCompanyDetail }) {
  const { company, profile } = detail

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>L&apos;établissement</CardTitle>
          <CardDescription>{LA_BONNE_BOITE_SOURCE_LABEL}</CardDescription>
        </CardHeader>
        <CardContent>
          <Facts
            facts={[
              ["Adresse", [company.postcode, company.city].filter(Boolean).join(" ")],
              ["Secteur", company.nafLabel],
              ["Effectif", headcountText(company)],
              ["Recrute dans", company.romeLabel],
              ["SIRET", company.siret],
            ]}
          />
          {company.highPotential ? (
            <Badge variant="secondary" className="mt-3">
              Fort potentiel d&apos;embauche
            </Badge>
          ) : null}
        </CardContent>
      </Card>
      {profile ? (
        <CompanyCard profile={profile} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>L&apos;entreprise</CardTitle>
            <CardDescription>
              Sa fiche publique n&apos;est pas encore lue : elle arrive dans
              l&apos;heure qui suit la première apparition de l&apos;entreprise.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}

function CompanyCard({ profile }: { profile: CompanyProfile }) {
  const finances = profile.finances
  const hasEgapro = profile.badges.some((badge) => badge.key === "egapro")

  return (
    <Card>
      <CardHeader>
        <CardTitle>L&apos;entreprise</CardTitle>
        <CardDescription>
          {COMPANY_SOURCE_LABEL}, lue le {formatDate(profile.refreshedAt)}.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {profile.closed ? (
          <p className="text-sm text-destructive">
            Cette entreprise est déclarée fermée au répertoire Sirene.
          </p>
        ) : null}
        <Facts
          facts={[
            ["Raison sociale", profile.legalName],
            ["SIREN", profile.siren],
            [
              "Catégorie",
              profile.category ? COMPANY_CATEGORY_LABELS[profile.category] : "",
            ],
            ["Effectif", profile.headcountLabel],
            ["Créée le", profile.createdOn ? formatDate(profile.createdOn) : ""],
            [
              "Établissements ouverts",
              profile.openEstablishments === null
                ? ""
                : String(profile.openEstablishments),
            ],
            [
              `Chiffre d'affaires ${finances?.year ?? ""}`.trim(),
              finances?.revenue == null ? "" : euros.format(finances.revenue),
            ],
            [
              `Résultat net ${finances?.year ?? ""}`.trim(),
              finances?.netIncome == null ? "" : euros.format(finances.netIncome),
            ],
          ]}
        />
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Engagements</h3>
          {profile.badges.length > 0 ? (
            <CompanyBadges badges={profile.badges} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun engagement public relevé (société à mission, ESS, entreprise
              inclusive, index égalité, bilan carbone).
            </p>
          )}
          {hasEgapro ? (
            <p className="text-xs text-muted-foreground">{EGAPRO_SOURCE_LABEL}</p>
          ) : null}
        </div>
        {profile.employerPage ? (
          <EmployerPageLink page={profile.employerPage} />
        ) : null}
        <a
          href={`https://annuaire-entreprises.data.gouv.fr/entreprise/${profile.siren}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
        >
          Fiche complète sur l&apos;Annuaire des entreprises
          <ExternalLinkIcon className="size-3.5" />
        </a>
      </CardContent>
    </Card>
  )
}

/**
 * Its page on France Travail's employer directory (US-116): what it says of
 * itself, and every offer it publishes there.
 */
function EmployerPageLink({
  page,
}: {
  page: NonNullable<CompanyProfile["employerPage"]>
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border p-3">
      <a
        href={page.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
      >
        Sa page employeur sur France Travail
        <ExternalLinkIcon className="size-3.5" />
      </a>
      <p className="text-sm text-muted-foreground">
        {page.offers > 0
          ? `${page.offers} offre${page.offers > 1 ? "s" : ""} publiée${page.offers > 1 ? "s" : ""}`
          : "Aucune offre publiée pour l'instant"}
        {page.edited ? " · présentée par l'entreprise elle-même" : ""}
      </p>
      <p className="text-xs text-muted-foreground">{EMPLOYER_PAGE_SOURCE_LABEL}</p>
    </div>
  )
}

/** Label and value pairs; an empty value is left out rather than dashed. */
function Facts({ facts }: { facts: Array<[string, string]> }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {facts
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  )
}
