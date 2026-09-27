"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import {
  ROME_SOURCE_LABEL,
  type RomeAppellationOption,
  type SearchProjectRomeAppellation,
} from "@cvforge/types"
import { BriefcaseBusinessIcon, CheckIcon, X } from "lucide-react"
import { toast } from "sonner"

import {
  decideRomeAppellation,
  findRomeAppellations,
} from "@/app/(app)/ma-recherche/actions"
import { SearchChip } from "@/components/job-search/search-chip"
import { searchTabHref } from "@/components/job-search/search-tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const SEARCH_DEBOUNCE_MS = 250
const MIN_QUERY_CHARS = 2

type Decide = (code: string, decision: "confirm" | "dismiss") => void

/**
 * "Vos métiers": the ROME jobs behind the titles the candidate typed (US-118).
 *
 * ROMEO suggests them when the criteria are saved; the candidate confirms or
 * dismisses each one, and every click is saved at once — a chip that waits for
 * another button to count is one nobody understands.
 */
export function SearchProjectRome({
  profileId,
  initialAppellations,
  onChange,
}: {
  profileId: string
  initialAppellations: SearchProjectRomeAppellation[]
  /** Told of every decision, for a parent that sums the jobs up. */
  onChange?: (appellations: SearchProjectRomeAppellation[]) => void
}) {
  const [appellations, setAppellations] = useState(initialAppellations)
  const [pending, startDeciding] = useTransition()

  const decide: Decide = (code, decision) =>
    startDeciding(async () => {
      const result = await decideRomeAppellation(profileId, code, decision)

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      setAppellations(result.rome)
      onChange?.(result.rome)
    })

  // Visible overflow: the picker's list drops below the card's edge.
  return (
    <Card className="overflow-visible">
      <CardHeader>
        <CardTitle>Vos métiers</CardTitle>
        <CardDescription>
          Les métiers du référentiel de France Travail qui correspondent à vos
          postes. Ce sont eux qui alimentent le marché et les entreprises qui
          recrutent.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <RomeAppellationLists
          appellations={appellations}
          criteriaHref={searchTabHref("/ma-recherche", profileId)}
          disabled={pending}
          onDecide={decide}
        />
        <RomeAppellationPicker
          disabled={pending}
          known={appellations}
          onPick={(code) => decide(code, "confirm")}
        />
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">{ROME_SOURCE_LABEL}</p>
      </CardFooter>
    </Card>
  )
}

/** ROMEO's suggestions to sort first, then the confirmed jobs. */
export function RomeAppellationLists({
  appellations,
  criteriaHref,
  disabled,
  onDecide,
}: {
  appellations: SearchProjectRomeAppellation[]
  criteriaHref: string
  disabled: boolean
  onDecide: Decide
}) {
  const confirmed = appellations.filter((entry) => entry.status === "confirmed")
  const suggested = appellations.filter((entry) => entry.status === "suggested")

  if (appellations.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BriefcaseBusinessIcon />
          </EmptyMedia>
          <EmptyTitle>Aucun métier pour l&apos;instant</EmptyTitle>
          <EmptyDescription>
            Renseignez vos postes visés et enregistrez vos critères : nous vous
            proposerons les métiers correspondants.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline" size="sm">
            <Link href={criteriaHref}>Renseigner mes postes</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <>
      {suggested.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed bg-muted/40 p-4">
          <div className="flex flex-col gap-0.5">
            <Label>À trier ({suggested.length})</Label>
            <p className="text-xs text-muted-foreground">
              Suggestions tirées de vos postes, avec notre degré de confiance.
            </p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {suggested.map((entry) => (
              <SearchChip
                key={entry.code}
                disabled={disabled}
                title={metierTitle(entry)}
                actions={[
                  {
                    icon: CheckIcon,
                    label: `Confirmer ${entry.libelle}`,
                    onClick: () => onDecide(entry.code, "confirm"),
                  },
                  {
                    icon: X,
                    label: `Écarter ${entry.libelle}`,
                    onClick: () => onDecide(entry.code, "dismiss"),
                  },
                ]}
              >
                {entry.libelle}
                {entry.score !== null ? (
                  <Badge variant="secondary" className="ml-1">
                    {Math.round(entry.score * 100)} %
                  </Badge>
                ) : null}
              </SearchChip>
            ))}
          </ul>
        </div>
      ) : null}

      {confirmed.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Label>Confirmés</Label>
          <ul className="flex flex-wrap gap-2">
            {confirmed.map((entry) => (
              <SearchChip
                key={entry.code}
                tone="solid"
                disabled={disabled}
                title={metierTitle(entry)}
                actions={[
                  {
                    icon: X,
                    label: `Retirer ${entry.libelle}`,
                    onClick: () => onDecide(entry.code, "dismiss"),
                  },
                ]}
              >
                {entry.libelle}
              </SearchChip>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  )
}

function metierTitle(appellation: RomeAppellationOption) {
  return appellation.metierLibelle
    ? `Métier : ${appellation.metierLibelle}`
    : undefined
}

/**
 * The fallback when ROMEO missed a job: searched in CVForge's copy of the
 * referential, the same way "Ajouter une ville" searches the communes.
 */
function RomeAppellationPicker({
  disabled,
  known,
  onPick,
}: {
  disabled: boolean
  known: SearchProjectRomeAppellation[]
  onPick: (code: string) => void
}) {
  const [query, setQuery] = useState("")
  const [matches, setMatches] = useState<RomeAppellationOption[]>([])
  const latest = useRef("")

  useEffect(() => {
    const term = query.trim()
    latest.current = term

    if (term.length < MIN_QUERY_CHARS) return

    const timer = setTimeout(async () => {
      const found = await findRomeAppellations(term)
      // An older answer arriving late must not replace a newer one.
      if (latest.current === term) setMatches(found)
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query])

  const confirmedCodes = new Set(
    known
      .filter((entry) => entry.status === "confirmed")
      .map((entry) => entry.code)
  )
  const choices = matches.filter((entry) => !confirmedCodes.has(entry.code))

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="search-rome">Ajouter un métier</Label>
      <div className="relative">
        <Input
          id="search-rome"
          autoComplete="off"
          placeholder="Boulanger, comptable, développeur…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            if (event.target.value.trim().length < MIN_QUERY_CHARS)
              setMatches([])
          }}
        />
        {choices.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border bg-popover text-sm shadow-md">
            {choices.map((entry) => (
              <li key={entry.code}>
                <button
                  type="button"
                  disabled={disabled}
                  className="w-full px-3 py-2 text-left hover:bg-accent"
                  onClick={() => {
                    onPick(entry.code)
                    setQuery("")
                    setMatches([])
                  }}
                >
                  {entry.libelle}
                  <span className="block text-xs text-muted-foreground">
                    {entry.metierLibelle}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
