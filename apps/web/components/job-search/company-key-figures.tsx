import type { CompanyProfile, HiringCompany } from "@cvforge/types"
import type { LucideIcon } from "lucide-react"
import {
  Building2Icon,
  CalendarIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react"

import { headcountText } from "@/components/job-search/hiring-companies"
import { formatDate } from "@/lib/format"

const euros = new Intl.NumberFormat("fr-FR", {
  currency: "EUR",
  maximumFractionDigits: 1,
  notation: "compact",
  style: "currency",
})

interface Figure {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  tone?: string
}

/**
 * The numbers a candidate weighs a company by, as tiles: how big, how solid,
 * how old. Only the ones we hold: an empty tile says nothing useful.
 */
export function CompanyKeyFigures({
  company,
  profile,
}: {
  company: HiringCompany
  profile: CompanyProfile | null
}) {
  const figures = keyFigures(company, profile)
  if (figures.length === 0) return null

  return (
    // Wrapping tiles that grow: five figures fill two full rows, where a
    // three-column grid would leave a hole.
    <ul className="flex flex-wrap gap-3">
      {figures.map((figure) => (
        <li
          key={figure.label}
          className="flex min-w-0 flex-[1_1_13rem] items-start gap-3 rounded-xl border bg-card p-4 shadow-surface"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <figure.icon className="size-4" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">
              {figure.label}
            </span>
            <span
              className={`text-lg leading-tight font-semibold tabular-nums ${figure.tone ?? ""}`}
            >
              {figure.value}
            </span>
            {figure.hint ? (
              <span className="text-xs text-muted-foreground">
                {figure.hint}
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}

export function keyFigures(
  company: HiringCompany,
  profile: CompanyProfile | null
): Figure[] {
  const figures: Figure[] = []
  const siteHeadcount = headcountText(company)
  const finances = profile?.finances

  if (siteHeadcount) {
    figures.push({
      hint: company.city ? `À ${company.city}` : undefined,
      icon: UsersIcon,
      label: "Effectif de l'établissement",
      value: siteHeadcount,
    })
  }

  if (profile?.headcountLabel) {
    figures.push({
      hint:
        profile.openEstablishments === null
          ? undefined
          : `${profile.openEstablishments} établissement${profile.openEstablishments > 1 ? "s" : ""} ouvert${profile.openEstablishments > 1 ? "s" : ""}`,
      icon: Building2Icon,
      label: "Effectif de l'entreprise",
      value: profile.headcountLabel,
    })
  }

  if (finances?.revenue != null) {
    figures.push({
      hint: "Derniers comptes publiés",
      icon: WalletIcon,
      label: `Chiffre d'affaires ${finances.year}`.trim(),
      value: euros.format(finances.revenue),
    })
  }

  if (finances?.netIncome != null) {
    const profitable = finances.netIncome >= 0

    figures.push({
      hint: profitable ? "Bénéficiaire" : "Déficitaire",
      icon: profitable ? TrendingUpIcon : TrendingDownIcon,
      label: `Résultat net ${finances.year}`.trim(),
      tone: profitable ? "text-success" : "text-destructive",
      value: euros.format(finances.netIncome),
    })
  }

  if (profile?.createdOn) {
    figures.push({
      hint: `Le ${formatDate(profile.createdOn)}`,
      icon: CalendarIcon,
      label: "Créée en",
      value: String(new Date(profile.createdOn).getUTCFullYear()),
    })
  }

  return figures
}
