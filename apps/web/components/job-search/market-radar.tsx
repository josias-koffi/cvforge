import Link from "next/link"
import {
  MARKET_SALARY_SOURCE_LABEL,
  MARKET_SOURCE_LABEL,
  MARKET_TENSION_LABELS,
  type MarketDepartmentStats,
  type MarketRadarEntry,
} from "@cvforge/types"
import { BarChart3Icon, MapPinIcon } from "lucide-react"
import { cn } from "cn"

import { searchTabHref } from "@/components/job-search/search-tabs"
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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

/** France Travail's scale: from "élevée", recruiters struggle to hire. */
const TENSE_FROM = 4
const TENSION_STEPS = [1, 2, 3, 4, 5] as const

const count = new Intl.NumberFormat("fr-FR")
const euros = new Intl.NumberFormat("fr-FR", {
  currency: "EUR",
  maximumFractionDigits: 0,
  style: "currency",
})
const day = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" })

/**
 * "Le marché de votre métier" (US-128): one card per confirmed job, and in it
 * each department of the search — how hard employers find it to recruit, how
 * many offers and job seekers there are, what offers pay, and the department
 * of the region with the most offers. Every figure carries its period; the
 * sources are named once, at the bottom. The page only reads the monthly copy.
 */
export function MarketRadar({
  entries,
  profileId,
}: {
  entries: MarketRadarEntry[]
  profileId: string
}) {
  if (entries.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BarChart3Icon />
          </EmptyMedia>
          <EmptyTitle>Pas encore de chiffres</EmptyTitle>
          <EmptyDescription>
            Confirmez un métier dans votre recherche : ses chiffres dans vos
            départements apparaîtront ici après la prochaine mise à jour.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline" size="sm">
            <Link href={searchTabHref("/ma-recherche/metiers", profileId)}>
              Choisir mes métiers
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  const hasSalary = entries.some((entry) => entry.local.salary)

  return (
    <div className="flex flex-col gap-4">
      {groupByJob(entries).map((job) => (
        <Card key={job.romeCode}>
          <CardHeader>
            <CardTitle>{job.romeLabel}</CardTitle>
            <CardDescription>
              Repères publics dans vos départements, mis à jour le{" "}
              {day.format(new Date(job.refreshedAt))}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {job.entries.map((entry) => (
              <DepartmentFigures key={entry.local.department} entry={entry} />
            ))}
          </CardContent>
        </Card>
      ))}
      <div className="flex flex-col gap-1 px-1">
        <p className="text-xs text-muted-foreground">{MARKET_SOURCE_LABEL}</p>
        {hasSalary ? (
          <p className="text-xs text-muted-foreground">
            {MARKET_SALARY_SOURCE_LABEL}
          </p>
        ) : null}
      </div>
    </div>
  )
}

/** The radar comes one row per job and department; the page reads by job. */
function groupByJob(entries: MarketRadarEntry[]) {
  const jobs = new Map<
    string,
    Pick<MarketRadarEntry, "refreshedAt" | "romeCode" | "romeLabel"> & {
      entries: MarketRadarEntry[]
    }
  >()

  for (const entry of entries) {
    const job = jobs.get(entry.romeCode)

    if (job) job.entries.push(entry)
    else jobs.set(entry.romeCode, { ...entry, entries: [entry] })
  }

  return [...jobs.values()]
}

function DepartmentFigures({ entry }: { entry: MarketRadarEntry }) {
  const { local, bestNeighbour } = entry
  const tense = local.tension !== null && local.tension.value >= TENSE_FROM

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium">
          {local.departmentLabel}{" "}
          <span className="text-muted-foreground">({local.department})</span>
        </h3>
        {tense ? (
          <Badge variant="secondary">
            Métier en tension dans votre département
          </Badge>
        ) : null}
      </div>
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {local.tension ? (
          <Tile
            label="Difficulté à recruter"
            value={MARKET_TENSION_LABELS[local.tension.value]}
            period={local.tension.period}
          >
            <TensionGauge level={local.tension.value} />
          </Tile>
        ) : null}
        {local.offers ? (
          <Tile
            label="Offres publiées"
            value={`${count.format(local.offers.value)} sur le trimestre`}
            period={local.offers.period}
          >
            {local.offersYear ? (
              <span className="text-xs text-muted-foreground">
                {count.format(local.offersYear.value)} sur douze mois
              </span>
            ) : null}
          </Tile>
        ) : null}
        {local.jobseekers ? (
          <Tile
            label="Demandeurs d'emploi (catégorie A)"
            value={count.format(local.jobseekers.value)}
            period={local.jobseekers.period}
          />
        ) : null}
        {local.salary ? (
          <Tile
            label="Salaire médian observé"
            value={`${euros.format(local.salary.medianYearly)} par an`}
            period={`${local.salary.sample} offres, ${local.salary.period}`}
          />
        ) : null}
      </dl>
      {bestNeighbour?.offersYear ? (
        <BestNeighbour department={bestNeighbour} />
      ) : null}
    </section>
  )
}

function Tile({
  children,
  label,
  period,
  value,
}: {
  children?: React.ReactNode
  label: string
  period: string
  value: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-base font-semibold">{value}</dd>
      {children ? <dd>{children}</dd> : null}
      <dd className="mt-auto pt-1 text-xs text-muted-foreground">{period}</dd>
    </div>
  )
}

/** Five steps, as France Travail grades it; filled up to the level. */
function TensionGauge({ level }: { level: number }) {
  return (
    <span aria-hidden className="flex gap-1">
      {TENSION_STEPS.map((step) => (
        <span
          key={step}
          className={cn(
            "h-1.5 flex-1 rounded-full",
            step > level
              ? "bg-muted"
              : level >= TENSE_FROM
                ? "bg-warning"
                : "bg-primary"
          )}
        />
      ))}
    </span>
  )
}

function BestNeighbour({ department }: { department: MarketDepartmentStats }) {
  const { offersYear, tension } = department

  return (
    <Alert role="note">
      <MapPinIcon />
      <AlertTitle>
        Plus porteur dans votre région :{" "}
        <span className="font-semibold">{department.departmentLabel}</span>
      </AlertTitle>
      <AlertDescription>
        {count.format(offersYear?.value ?? 0)} offres sur douze mois
        {tension
          ? `, difficulté à recruter ${MARKET_TENSION_LABELS[tension.value]}`
          : ""}{" "}
        ({offersYear?.period})
      </AlertDescription>
    </Alert>
  )
}
