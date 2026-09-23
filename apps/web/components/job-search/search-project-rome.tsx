"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import {
  ROME_SOURCE_LABEL,
  type RomeAppellationOption,
  type SearchProjectRomeAppellation,
} from "@cvforge/types"
import { CheckIcon, X } from "lucide-react"
import { toast } from "sonner"

import {
  decideRomeAppellation,
  findRomeAppellations,
} from "@/app/(app)/ma-recherche/actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const SEARCH_DEBOUNCE_MS = 250
const MIN_QUERY_CHARS = 2

type Decide = (code: string, decision: "confirm" | "dismiss") => void

/**
 * "Vos métiers": the ROME jobs behind the titles the candidate typed (US-118).
 *
 * ROMEO suggests them when the search is saved; the candidate confirms or
 * dismisses each one, and every click is saved at once — a chip that waits for
 * another button to count is one nobody understands.
 */
export function SearchProjectRome({
  profileId,
  appellations,
  onChange,
}: {
  profileId: string
  appellations: SearchProjectRomeAppellation[]
  onChange: (next: SearchProjectRomeAppellation[]) => void
}) {
  const [pending, startDeciding] = useTransition()

  const decide: Decide = (code, decision) =>
    startDeciding(async () => {
      const result = await decideRomeAppellation(profileId, code, decision)

      if (result.ok) onChange(result.rome)
      else toast.error(result.message)
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vos métiers</CardTitle>
        <CardDescription>
          Les métiers du référentiel de France Travail qui correspondent à vos
          postes. Confirmez ceux qui vous ressemblent.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <RomeAppellationLists
          appellations={appellations}
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

/** Confirmed jobs, then ROMEO's suggestions with their confidence. */
export function RomeAppellationLists({
  appellations,
  disabled,
  onDecide,
}: {
  appellations: SearchProjectRomeAppellation[]
  disabled: boolean
  onDecide: Decide
}) {
  const confirmed = appellations.filter((entry) => entry.status === "confirmed")
  const suggested = appellations.filter((entry) => entry.status === "suggested")

  if (appellations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Enregistrez votre recherche : nous vous proposerons les métiers
        correspondants.
      </p>
    )
  }

  return (
    <>
      {confirmed.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Label>Confirmés</Label>
          <ul className="flex flex-wrap gap-2">
            {confirmed.map((entry) => (
              <li
                key={entry.code}
                className="flex items-center gap-1 rounded-md bg-primary py-1 pr-1 pl-3 text-sm text-primary-foreground"
              >
                <AppellationLabel appellation={entry} />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  disabled={disabled}
                  aria-label={`Retirer ${entry.libelle}`}
                  onClick={() => onDecide(entry.code, "dismiss")}
                >
                  <X className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {suggested.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Label>Suggestions</Label>
          <ul className="flex flex-wrap gap-2">
            {suggested.map((entry) => (
              <li
                key={entry.code}
                className="flex items-center gap-1 rounded-md border border-border py-1 pr-1 pl-3 text-sm"
              >
                <AppellationLabel appellation={entry} />
                {entry.score !== null ? (
                  <span className="text-xs text-muted-foreground">
                    {Math.round(entry.score * 100)} %
                  </span>
                ) : null}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  disabled={disabled}
                  aria-label={`Confirmer ${entry.libelle}`}
                  onClick={() => onDecide(entry.code, "confirm")}
                >
                  <CheckIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  disabled={disabled}
                  aria-label={`Écarter ${entry.libelle}`}
                  onClick={() => onDecide(entry.code, "dismiss")}
                >
                  <X className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  )
}

function AppellationLabel({
  appellation,
}: {
  appellation: RomeAppellationOption
}) {
  return (
    <span
      title={
        appellation.metierLibelle
          ? `Métier : ${appellation.metierLibelle}`
          : undefined
      }
    >
      {appellation.libelle}
    </span>
  )
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
      <Input
        id="search-rome"
        autoComplete="off"
        placeholder="Boulanger, comptable, développeur…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          if (event.target.value.trim().length < MIN_QUERY_CHARS) setMatches([])
        }}
      />
      {choices.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border bg-popover text-sm">
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
                <span className="text-muted-foreground">
                  {" "}
                  — {entry.metierLibelle}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
