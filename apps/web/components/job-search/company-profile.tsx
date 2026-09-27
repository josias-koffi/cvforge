import {
  COMPANY_CATEGORY_LABELS,
  COMPANY_SOURCE_LABEL,
  EMPLOYER_PAGE_SOURCE_LABEL,
  LA_BONNE_BOITE_SOURCE_LABEL,
  type CompanyProfile,
  type HiringCompanyDetail,
} from "@cvforge/types"
import {
  BriefcaseIcon,
  CircleAlertIcon,
  ExternalLinkIcon,
  HourglassIcon,
  TrendingUpIcon,
} from "lucide-react"

import { CompanyCommitments } from "@/components/job-search/company-commitments"
import { CompanyKeyFigures } from "@/components/job-search/company-key-figures"
import { CompanyMark } from "@/components/job-search/company-mark"
import { headcountText } from "@/components/job-search/hiring-companies"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDate } from "@/lib/format"

/**
 * A company's page (US-121): the establishment La Bonne Boîte lists, the
 * company behind it from the Annuaire des entreprises, and its commitments.
 * Every figure says where it comes from.
 *
 * Laid out for the question the candidate comes with — "is it worth a
 * spontaneous application?": who it is and what it hires for first, with the
 * action beside it; then its figures, its commitments, and the record.
 *
 * `action` is the spontaneous application button: the page owns the profile
 * it applies with.
 */
export function CompanyProfileView({
  detail,
  action,
}: {
  detail: HiringCompanyDetail
  action?: React.ReactNode
}) {
  const { company, profile } = detail

  return (
    <div className="flex flex-col gap-4">
      <CompanyHero detail={detail} />

      {profile?.closed ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Entreprise fermée</AlertTitle>
          <AlertDescription>
            Cette entreprise est déclarée fermée au répertoire Sirene.
            L&apos;établissement peut encore figurer chez France Travail.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 @4xl/main:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 @4xl/main:col-span-2">
          <CompanyKeyFigures company={company} profile={profile} />
          {profile ? (
            <CompanyCommitments badges={profile.badges} />
          ) : (
            <PendingProfile />
          )}
          <CompanyRecord detail={detail} />
        </div>

        <aside className="flex flex-col gap-4">
          <HiringCard detail={detail} action={action} />
          {profile?.employerPage ? (
            <EmployerPageCard page={profile.employerPage} />
          ) : null}
        </aside>
      </div>
    </div>
  )
}

/** Who it is, at a glance: the same mark as on its card in the list. */
function CompanyHero({ detail }: { detail: HiringCompanyDetail }) {
  const { company, profile } = detail

  return (
    <Card className="[--card-spacing:--spacing(6)]">
      <CardContent className="flex flex-col gap-4 @2xl/main:flex-row @2xl/main:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="[&_[data-slot=avatar-fallback]]:text-xl [&_[data-slot=avatar]]:size-14">
            <CompanyMark name={company.name} logoUrl={company.logoUrl} />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-xl leading-tight font-semibold">
              {company.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {[company.nafLabel, company.city].filter(Boolean).join(" · ")}
            </p>
            {profile?.legalName && profile.legalName !== company.name ? (
              <p className="text-xs text-muted-foreground">
                {profile.legalName}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {company.highPotential ? (
            <Badge variant="success">
              <TrendingUpIcon aria-hidden />
              Fort potentiel d&apos;embauche
            </Badge>
          ) : null}
          {profile?.category ? (
            <Badge variant="outline">
              {COMPANY_CATEGORY_LABELS[profile.category]}
            </Badge>
          ) : null}
          {profile?.closed ? <Badge variant="destructive">Fermée</Badge> : null}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Why it is on the list, and the one thing to do about it. The cost is said
 * here, where the decision is made.
 */
function HiringCard({
  detail,
  action,
}: {
  detail: HiringCompanyDetail
  action?: React.ReactNode
}) {
  const { company } = detail

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardHeader>
        <CardTitle>Elle recrute</CardTitle>
        <CardDescription>
          France Travail prévoit des embauches dans votre métier, même sans
          offre publiée.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-2 text-sm">
          <BriefcaseIcon
            className="mt-0.5 size-4 shrink-0 text-primary"
            aria-hidden
          />
          <span>
            <span className="text-muted-foreground">Recrute dans : </span>
            {company.romeLabel}
          </span>
        </div>
        {company.highPotential ? (
          <div className="flex items-start gap-2 text-sm">
            <TrendingUpIcon
              className="mt-0.5 size-4 shrink-0 text-success"
              aria-hidden
            />
            <span>
              Parmi les établissements au plus fort potentiel d&apos;embauche
              selon La Bonne Boîte.
            </span>
          </div>
        ) : null}
        {action ? (
          <div className="flex flex-col gap-2 [&_button]:w-full">
            {action}
            <p className="text-xs text-muted-foreground">
              Gratuite à créer ; le CV et la lettre adaptés coûtent les crédits
              habituels.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

/**
 * Its page on France Travail's employer directory (US-116): what it says of
 * itself, and every offer it publishes there.
 */
function EmployerPageCard({
  page,
}: {
  page: NonNullable<CompanyProfile["employerPage"]>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sa page employeur</CardTitle>
        <CardDescription>
          {page.offers > 0
            ? `${page.offers} offre${page.offers > 1 ? "s" : ""} publiée${page.offers > 1 ? "s" : ""}`
            : "Aucune offre publiée pour l'instant"}
          {page.edited ? " · présentée par l'entreprise elle-même" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button asChild variant="outline" className="w-full">
          <a href={page.url} target="_blank" rel="noreferrer">
            Voir sur France Travail
            <ExternalLinkIcon />
          </a>
        </Button>
        <p className="text-xs text-muted-foreground">
          {EMPLOYER_PAGE_SOURCE_LABEL}
        </p>
      </CardContent>
    </Card>
  )
}

function PendingProfile() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HourglassIcon className="size-4 text-muted-foreground" aria-hidden />
          L&apos;entreprise
        </CardTitle>
        <CardDescription>
          Sa fiche publique n&apos;est pas encore lue : elle arrive dans
          l&apos;heure qui suit la première apparition de l&apos;entreprise.
          Chiffres et engagements s&apos;afficheront ici.
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

/** The record: the establishment, and the legal entity behind it. */
function CompanyRecord({ detail }: { detail: HiringCompanyDetail }) {
  const { company, profile } = detail

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fiche d&apos;identité</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 @2xl/main:grid-cols-2">
        <section className="flex flex-col gap-3">
          <RecordHeading
            title="L'établissement"
            source={LA_BONNE_BOITE_SOURCE_LABEL}
          />
          <Facts
            facts={[
              [
                "Adresse",
                [company.postcode, company.city].filter(Boolean).join(" "),
              ],
              ["Secteur", company.nafLabel],
              ["Effectif", headcountText(company)],
              ["SIRET", company.siret],
            ]}
          />
        </section>
        {profile ? (
          <section className="flex flex-col gap-3">
            <RecordHeading
              title="L'entreprise"
              source={`${COMPANY_SOURCE_LABEL}, lue le ${formatDate(profile.refreshedAt)}.`}
            />
            <Facts
              facts={[
                ["Raison sociale", profile.legalName],
                ["SIREN", profile.siren],
                [
                  "Catégorie",
                  profile.category
                    ? COMPANY_CATEGORY_LABELS[profile.category]
                    : "",
                ],
                [
                  "Créée le",
                  profile.createdOn ? formatDate(profile.createdOn) : "",
                ],
              ]}
            />
            <a
              href={`https://annuaire-entreprises.data.gouv.fr/entreprise/${profile.siren}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
            >
              Fiche complète sur l&apos;Annuaire des entreprises
              <ExternalLinkIcon className="size-3.5" />
            </a>
          </section>
        ) : null}
      </CardContent>
    </Card>
  )
}

function RecordHeading({ title, source }: { title: string; source: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-xs text-muted-foreground">{source}</p>
    </div>
  )
}

/** Label and value pairs; an empty value is left out rather than dashed. */
function Facts({ facts }: { facts: Array<[string, string]> }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      {facts
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words">{value}</dd>
          </div>
        ))}
    </dl>
  )
}
