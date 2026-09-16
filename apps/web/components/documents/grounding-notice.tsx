"use client"

import { useState } from "react"
import Link from "next/link"
import { ShieldCheckIcon, XIcon } from "lucide-react"
import type { GroundingRemoval, GroundingReport } from "@cvforge/types"

import { Button } from "@/components/ui/button"

const KIND_LABELS: Record<GroundingRemoval["kind"], string> = {
  achievement: "réalisation",
  certification: "certification",
  education: "formation",
  experience: "expérience",
  language: "langue",
  project: "projet",
  skill: "compétence",
}

function summarise(removals: GroundingRemoval[]) {
  const kinds = new Set(removals.map((removal) => removal.kind))
  if (kinds.size === 1) {
    const [kind] = [...kinds]
    const label = KIND_LABELS[kind]
    return removals.length === 1
      ? `1 ${label} a été retirée`
      : `${removals.length} ${label}s ont été retirées`
  }
  return `${removals.length} éléments ont été retirés`
}

/**
 * Tells the candidate what the server dropped for lack of profile backing.
 *
 * A CV that overstates what someone has done puts them in a bad place in the
 * interview, so removals are surfaced rather than silently applied — and the
 * candidate is pointed at their profile when the claim was in fact true.
 */
export function GroundingNotice({ report }: { report?: GroundingReport }) {
  const [dismissed, setDismissed] = useState(false)

  if (!report || report.removals.length === 0 || dismissed) return null

  return (
    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100">
      <div className="flex items-start gap-3">
        <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="flex-1">
          <p className="font-medium">
            {summarise(report.removals)} du CV généré.
          </p>
          <p className="mt-1">
            Ces éléments ne figurent pas dans votre profil, l&apos;IA les avait
            ajoutés d&apos;elle-même : {report.removals.map((removal) => removal.label).join(", ")}.
          </p>
          <p className="mt-1">
            Si vous les maîtrisez réellement,{" "}
            <Link href="/profil" className="font-medium underline underline-offset-2">
              ajoutez-les à votre profil
            </Link>{" "}
            puis relancez la génération.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={() => setDismissed(true)}
          aria-label="Masquer cet avertissement"
        >
          <XIcon className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
