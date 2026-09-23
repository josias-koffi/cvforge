"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { BookmarkIcon, ExternalLinkIcon, SparklesIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { applyToMatch, setMatchStatus } from "@/app/(app)/offres-du-jour/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import type { JobListingSummary, JobMatchStatus, JobOffer } from "@/lib/job-search"

const CONTRACT_LABELS: Record<string, string> = {
  alternance: "Alternance",
  cdd: "CDD",
  cdi: "CDI",
  freelance: "Freelance",
  interim: "Intérim",
  stage: "Stage",
  unknown: "Contrat non précisé",
  vie: "VIE",
}

/**
 * Where the offer can be read, in the wording the licences require.
 *
 * France Travail's reuse licence asks for the source to be named and the
 * original advert to be linked; a company's own board is named after the
 * employer, because that is what the candidate recognises.
 */
const SOURCE_LABELS: Record<string, string> = {
  adzuna: "Adzuna",
  ashby: "Site de l'entreprise",
  france_travail: "France Travail",
  greenhouse: "Site de l'entreprise",
  la_bonne_alternance: "La bonne alternance",
  lever: "Site de l'entreprise",
  personio: "Site de l'entreprise",
  recruitee: "Site de l'entreprise",
  smartrecruiters: "Site de l'entreprise",
  welcomekit: "Welcome to the Jungle",
  workable: "Site de l'entreprise",
}

function scoreTone(score: number) {
  if (score >= 75) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
  if (score >= 55) return "bg-amber-500/10 text-amber-600 dark:text-amber-400"

  return "bg-muted text-muted-foreground"
}

/**
 * One offer, wherever it comes from.
 *
 * The morning selection carries a score and sometimes an explanation; an offer
 * the candidate found by searching carries neither, and the card simply does
 * not show them rather than showing a zero.
 */
export interface JobCardOffer {
  job: JobOffer
  listings: JobListingSummary[]
  status: JobMatchStatus | null
  score: number | null
  aiReason: string | null
}

export function JobMatchCard({ match }: { match: JobCardOffer }) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(match.status === "dismissed")
  const [saved, setSaved] = useState(match.status === "saved")
  const applied = match.status === "applied"
  const [applying, startApplying] = useTransition()
  const [updating, startUpdating] = useTransition()
  const openListings = match.listings.filter((listing) => !listing.closedAt)

  const apply = () =>
    startApplying(async () => {
      const result = await applyToMatch(match.job.id)

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      toast.success("Candidature créée. À vous de jouer.")
      router.push(`/candidatures/${result.applicationId}`)
    })

  const update = (status: "saved" | "dismissed") =>
    startUpdating(async () => {
      const result = await setMatchStatus(match.job.id, status)

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      if (status === "saved") setSaved(true)
      else setDismissed(true)
      toast.success(result.message)
    })

  if (dismissed) return null

  return (
    <Card className={saved ? "border-primary/40" : undefined}>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-medium">{match.job.title}</h3>
            <p className="text-muted-foreground text-sm">
              {match.job.companyAnonymous
                ? "Entreprise non communiquée"
                : match.job.companyName}
              {match.job.locationLabel ? ` · ${match.job.locationLabel}` : ""}
            </p>
          </div>
          {match.score === null ? null : (
            <span
              className={`rounded-md px-2 py-1 text-sm font-medium ${scoreTone(match.score)}`}
              title="Score de correspondance avec votre recherche"
            >
              {match.score}/100
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {CONTRACT_LABELS[match.job.contractType] ?? match.job.contractType}
          </Badge>
          {match.job.remote ? <Badge variant="secondary">Télétravail</Badge> : null}
          {match.job.salaryLabel ? (
            <Badge variant="secondary">{match.job.salaryLabel}</Badge>
          ) : null}

        </div>

        {match.aiReason ? (
          <p className="text-muted-foreground flex gap-2 text-sm">
            <SparklesIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            {match.aiReason}
          </p>
        ) : null}

        {openListings.length > 0 ? (
          <p className="text-muted-foreground text-xs">
            Disponible sur :{" "}
            {openListings.map((listing, index) => (
              <span key={listing.id}>
                {index > 0 ? " · " : ""}
                <a
                  href={listing.url || listing.applyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4"
                >
                  {SOURCE_LABELS[listing.source] ?? listing.source}
                </a>
              </span>
            ))}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button disabled={applying || applied} onClick={apply}>
            {applying ? <Spinner /> : <SparklesIcon />}
            {applied ? "Candidature créée" : "Postuler avec CVForge"}
          </Button>
          <Button asChild variant="outline">
            <a href={match.job.primaryUrl} target="_blank" rel="noreferrer">
              <ExternalLinkIcon />
              Voir l&apos;offre
            </a>
          </Button>
          <Button
            variant="ghost"
            disabled={updating || saved}
            onClick={() => update("saved")}
          >
            <BookmarkIcon />
            {saved ? "Gardée" : "Garder"}
          </Button>
          <Button variant="ghost" disabled={updating} onClick={() => update("dismissed")}>
            <XIcon />
            Pas pour moi
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
