import type { CompanyBadge } from "@cvforge/types"

import { Badge } from "@/components/ui/badge"

/**
 * A company's public commitments (US-121): société à mission, ESS, inclusive
 * employer, equality index, carbon report. Nothing shows before they are read.
 */
export function CompanyBadges({ badges }: { badges: CompanyBadge[] }) {
  if (badges.length === 0) return null

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Engagements">
      {badges.map((badge) => (
        <li key={badge.key}>
          <Badge variant="outline">{badge.label}</Badge>
        </li>
      ))}
    </ul>
  )
}
