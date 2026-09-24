import { ROME_SOURCE_LABEL } from "@cvforge/types"

import { Badge } from "@/components/ui/badge"
import type { JobCardOffer } from "@/lib/job-search"

/** Labels shown on a card before "+n": the card has to stay comparable. */
const CARD_LABELS = 2

/**
 * "Vous avez" and "À mettre en avant" (US-127): the skills of the candidate
 * the offer asks for, and what it asks that their CV does not show.
 *
 * The second list is phrased as something to bring forward, never as a gap:
 * the candidate may well have it and simply not have written it down.
 */
export function OfferSkills({
  offer,
  compact = false,
}: {
  offer: JobCardOffer
  compact?: boolean
}) {
  const matched = offer.matchedSkills ?? []
  const missing = offer.missingSkills ?? []

  if (matched.length === 0 && missing.length === 0) return null

  if (compact) {
    return (
      <dl className="flex flex-col gap-0.5 text-xs">
        <CompactLine label="Vous avez" skills={matched} />
        <CompactLine label="À mettre en avant" skills={missing} />
      </dl>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <SkillList title="Vous avez" skills={matched} variant="outline" />
      <SkillList
        title="À mettre en avant"
        hint="Ce que l'offre demande et que votre CV ne montre pas. Si vous le maîtrisez, « Postuler avec CVForge » le proposera à la génération de votre CV — sans jamais l'inventer."
        skills={missing}
        variant="secondary"
      />
      {offer.job.romeCode ? (
        <p className="text-xs text-muted-foreground">{ROME_SOURCE_LABEL}</p>
      ) : null}
    </div>
  )
}

function CompactLine({ label, skills }: { label: string; skills: string[] }) {
  if (skills.length === 0) return null

  const shown = skills.slice(0, CARD_LABELS).join(", ")
  const more = skills.length - CARD_LABELS

  return (
    <div className="flex min-w-0 gap-1">
      <dt className="shrink-0 text-muted-foreground">{label} :</dt>
      <dd className="truncate" title={skills.join(", ")}>
        {shown}
        {more > 0 ? ` +${more}` : ""}
      </dd>
    </div>
  )
}

function SkillList({
  title,
  hint,
  skills,
  variant,
}: {
  title: string
  hint?: string
  skills: string[]
  variant: "outline" | "secondary"
}) {
  if (skills.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-medium">{title}</h4>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <Badge key={skill} variant={variant} className="whitespace-normal">
            {skill}
          </Badge>
        ))}
      </div>
    </div>
  )
}
