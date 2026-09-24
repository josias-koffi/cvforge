import type { LucideIcon } from "lucide-react"
import {
  BanknoteIcon,
  BriefcaseBusinessIcon,
  UsersIcon,
} from "lucide-react"
import type { MarketTensionLevel, PublicJobMarketResponse } from "@cvforge/types"

import type { LandingDictionary } from "@/content/types"
import { format } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type Dictionary = LandingDictionary["jobMarket"]["result"]
type Stats = NonNullable<PublicJobMarketResponse["stats"]>

const TENSION_LEVELS: MarketTensionLevel[] = [1, 2, 3, 4, 5]

/**
 * France Travail's tension: five segments, the words carrying the meaning.
 * The segments are decoration for the eye; a screen reader reads the phrase.
 */
export function TensionGauge({
  tension,
  dictionary,
}: {
  tension: Stats["tension"]
  dictionary: Dictionary
}) {
  return (
    <section className="rounded-xl border p-5">
      <h3 className="text-sm font-medium text-muted-foreground">
        {dictionary.tension.title}
      </h3>
      {tension ? (
        <>
          <div aria-hidden="true" className="mt-3 flex gap-1.5">
            {TENSION_LEVELS.map((level) => (
              <span
                className={cn(
                  "h-2.5 flex-1 rounded-full border",
                  level <= tension.value
                    ? "border-primary bg-primary"
                    : "border-border bg-muted"
                )}
                key={level}
              />
            ))}
          </div>
          <p className="mt-3 text-lg font-medium text-pretty">
            {dictionary.tension.levels[String(tension.value) as "1"]}
          </p>
          <p className="text-sm text-muted-foreground">
            {format(dictionary.tension.scale, { value: tension.value })} ·{" "}
            {format(dictionary.period, { period: tension.period })}
          </p>
        </>
      ) : (
        <p className="mt-2 text-lg font-medium">{dictionary.missing}</p>
      )}
    </section>
  )
}

/** The three counts, each with its period, or "not published". */
export function MarketFigures({
  stats,
  salaryMinSample,
  dictionary,
  locale,
}: {
  stats: Stats
  salaryMinSample: number
  dictionary: Dictionary
  locale: string
}) {
  const number = new Intl.NumberFormat(locale)
  const euros = new Intl.NumberFormat(locale, {
    currency: "EUR",
    maximumFractionDigits: 0,
    style: "currency",
  })

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Figure
        detail={
          stats.offersYear
            ? format(dictionary.offers.yearly, {
                count: number.format(stats.offersYear.value),
              })
            : null
        }
        icon={BriefcaseBusinessIcon}
        period={stats.offers?.period ?? null}
        periodLabel={dictionary.period}
        title={dictionary.offers.title}
        value={stats.offers ? number.format(stats.offers.value) : null}
        missing={dictionary.missing}
      />
      <Figure
        detail={dictionary.jobseekers.note}
        icon={UsersIcon}
        period={stats.jobseekers?.period ?? null}
        periodLabel={dictionary.period}
        title={dictionary.jobseekers.title}
        value={stats.jobseekers ? number.format(stats.jobseekers.value) : null}
        missing={dictionary.missing}
      />
      {stats.salary ? (
        <Figure
          detail={format(dictionary.salary.sample, {
            count: stats.salary.sample,
          })}
          icon={BanknoteIcon}
          period={stats.salary.period}
          periodLabel={dictionary.period}
          title={dictionary.salary.title}
          value={euros.format(stats.salary.medianYearly)}
          missing={dictionary.missing}
        />
      ) : (
        <section className="rounded-xl border p-5">
          <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <BanknoteIcon aria-hidden="true" className="size-4" />
            {dictionary.salary.title}
          </h3>
          <p className="mt-2 text-sm text-pretty">
            {format(dictionary.salary.masked, { min: salaryMinSample })}
          </p>
        </section>
      )}
    </div>
  )
}

function Figure({
  title,
  icon: Icon,
  value,
  detail,
  period,
  periodLabel,
  missing,
}: {
  title: string
  icon: LucideIcon
  value: string | null
  detail: string | null
  period: string | null
  periodLabel: string
  missing: string
}) {
  return (
    <section className="rounded-xl border p-5">
      <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon aria-hidden="true" className="size-4" />
        {title}
      </h3>
      <p className="mt-2 text-2xl font-semibold tabular-nums">
        {value ?? missing}
      </p>
      {value && detail ? (
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      ) : null}
      {value && period ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {format(periodLabel, { period })}
        </p>
      ) : null}
    </section>
  )
}
