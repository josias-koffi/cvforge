import {
  MARKET_SALARY_SOURCE_LABEL,
  MARKET_SOURCE_LABEL,
  MARKET_TENSION_LABELS,
  type MarketDepartmentStats,
  type MarketRadarEntry,
} from "@cvforge/types"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/** France Travail's scale: from "élevée", recruiters struggle to hire. */
const TENSE_FROM = 4

const count = new Intl.NumberFormat("fr-FR")
const euros = new Intl.NumberFormat("fr-FR", {
  currency: "EUR",
  maximumFractionDigits: 0,
  style: "currency",
})

/**
 * "Le marché de votre métier" (US-128): for each confirmed job and each
 * department of the search, how hard employers find it to recruit, how many
 * offers and job seekers there are, what offers pay, and the department of
 * the region with the most offers. Every figure carries its period; the
 * footer names the sources. The page only reads the monthly copy.
 */
export function MarketRadar({ entries }: { entries: MarketRadarEntry[] }) {
  const hasSalary = entries.some((entry) => entry.local.salary)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Le marché de votre métier</CardTitle>
        <CardDescription>
          Des repères publics, relus chaque mois : réaliste, où, et combien
          demander.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Confirmez un métier dans votre recherche : ses chiffres dans vos
            départements apparaîtront ici après la prochaine mise à jour.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {entries.map((entry) => (
              <MarketEntry
                key={`${entry.romeCode}-${entry.local.department}`}
                entry={entry}
              />
            ))}
          </div>
        )}
      </CardContent>
      {entries.length > 0 ? (
        <CardFooter className="flex flex-col items-start gap-1">
          <p className="text-xs text-muted-foreground">{MARKET_SOURCE_LABEL}</p>
          {hasSalary ? (
            <p className="text-xs text-muted-foreground">
              {MARKET_SALARY_SOURCE_LABEL}
            </p>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  )
}

function MarketEntry({ entry }: { entry: MarketRadarEntry }) {
  const { local, bestNeighbour } = entry
  const tense = local.tension !== null && local.tension.value >= TENSE_FROM

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium">
          {entry.romeLabel} · {local.departmentLabel}
        </h3>
        {tense ? (
          <Badge variant="secondary">
            Métier en tension dans votre département
          </Badge>
        ) : null}
      </div>
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {local.tension ? (
          <Figure
            label="Difficulté à recruter"
            value={MARKET_TENSION_LABELS[local.tension.value]}
            period={local.tension.period}
          />
        ) : null}
        {local.offers ? (
          <Figure
            label="Offres publiées"
            value={offersText(local)}
            period={local.offers.period}
          />
        ) : null}
        {local.jobseekers ? (
          <Figure
            label="Demandeurs d'emploi (catégorie A)"
            value={count.format(local.jobseekers.value)}
            period={local.jobseekers.period}
          />
        ) : null}
        {local.salary ? (
          <Figure
            label="Salaire médian observé"
            value={`${euros.format(local.salary.medianYearly)} par an`}
            period={`${local.salary.sample} offres, ${local.salary.period}`}
          />
        ) : null}
      </dl>
      {bestNeighbour?.offersYear ? (
        <p className="text-sm">
          Plus porteur dans votre région :{" "}
          <span className="font-medium">{bestNeighbour.departmentLabel}</span>,{" "}
          {count.format(bestNeighbour.offersYear.value)} offres sur douze mois
          {bestNeighbour.tension
            ? `, difficulté à recruter ${MARKET_TENSION_LABELS[bestNeighbour.tension.value]}`
            : ""}{" "}
          <span className="text-muted-foreground">
            ({bestNeighbour.offersYear.period})
          </span>
        </p>
      ) : null}
    </section>
  )
}

function Figure({
  label,
  value,
  period,
}: {
  label: string
  value: string
  period: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
      <dd className="text-xs text-muted-foreground">{period}</dd>
    </div>
  )
}

function offersText(local: MarketDepartmentStats): string {
  const quarter = count.format(local.offers?.value ?? 0)

  return local.offersYear
    ? `${quarter} sur le trimestre, ${count.format(local.offersYear.value)} sur douze mois`
    : quarter
}
