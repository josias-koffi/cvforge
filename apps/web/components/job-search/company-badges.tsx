import type { CompanyBadge, CompanyBadgeKey } from "@cvforge/types"
import type { LucideIcon } from "lucide-react"
import {
  AccessibilityIcon,
  HandHeartIcon,
  LeafIcon,
  ScaleIcon,
  TargetIcon,
} from "lucide-react"

/** One icon per commitment, the same on the list and on the company's page. */
export const COMMITMENT_ICONS: Record<CompanyBadgeKey, LucideIcon> = {
  egapro: ScaleIcon,
  ess: HandHeartIcon,
  ges: LeafIcon,
  inclusive: AccessibilityIcon,
  mission: TargetIcon,
}

/**
 * A company's public commitments (US-121): société à mission, ESS, inclusive
 * employer, equality index, carbon report. Nothing shows before they are read.
 *
 * Green chips with their icon, as the company's page shows them: a
 * commitment is a point in its favour, not a neutral tag.
 */
export function CompanyBadges({ badges }: { badges: CompanyBadge[] }) {
  if (badges.length === 0) return null

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Engagements">
      {badges.map((badge) => {
        const Icon = COMMITMENT_ICONS[badge.key]

        return (
          <li
            key={badge.key}
            className="inline-flex items-center gap-1.5 rounded-md border bg-success/5 px-2 py-1 text-xs"
          >
            <Icon className="size-3.5 shrink-0 text-success" aria-hidden />
            {badge.label}
          </li>
        )
      })}
    </ul>
  )
}
