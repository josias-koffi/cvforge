import type { LucideIcon } from "lucide-react"
import { BriefcaseIcon, EuroIcon, HouseIcon, MapPinIcon } from "lucide-react"

import { CONTRACT_LABELS } from "@/lib/job-labels"
import type { JobOffer } from "@/lib/job-search"

/**
 * Where, what contract, remote, pay: the four facts a candidate compares
 * first, each with its icon so they read at a glance instead of as a row of
 * identical grey badges.
 *
 * `compact` clamps the place to one line: some sources list a dozen cities in
 * one advert, and a card has to stay comparable with its neighbours.
 */
export function OfferMeta({
  job,
  compact = false,
}: {
  job: JobOffer
  compact?: boolean
}) {
  return (
    <MetaList>
      <MetaItem icon={MapPinIcon} label="Lieu" wide={compact}>
        <span className={compact ? "truncate" : undefined}>
          {job.locationLabel || "Lieu non précisé"}
        </span>
      </MetaItem>
      <MetaItem icon={BriefcaseIcon} label="Contrat">
        {CONTRACT_LABELS[job.contractType] ?? job.contractType}
      </MetaItem>
      {job.remote ? (
        <MetaItem icon={HouseIcon} label="Télétravail">
          Télétravail
        </MetaItem>
      ) : null}
      {job.salaryLabel ? (
        <MetaItem icon={EuroIcon} label="Salaire">
          {job.salaryLabel}
        </MetaItem>
      ) : null}
    </MetaList>
  )
}

/** Facts with an icon each, as the offer and company cards show them. */
export function MetaList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
      {children}
    </ul>
  )
}

export function MetaItem({
  icon: Icon,
  label,
  wide = false,
  children,
}: {
  icon: LucideIcon
  label: string
  /** Takes its own line, so a long place does not push the rest around. */
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <li className={`flex min-w-0 items-center gap-1.5 ${wide ? "w-full" : ""}`}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="sr-only">{label} :</span>
      {children}
    </li>
  )
}
