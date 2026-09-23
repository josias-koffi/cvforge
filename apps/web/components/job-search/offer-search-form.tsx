"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { RotateCcwIcon, SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { OfferSearchFilters } from "@/lib/job-search"

const CONTRACTS = [
  { id: "cdi", label: "CDI" },
  { id: "cdd", label: "CDD" },
  { id: "interim", label: "Intérim" },
  { id: "freelance", label: "Freelance" },
  { id: "stage", label: "Stage" },
  { id: "alternance", label: "Alternance" },
  { id: "vie", label: "VIE" },
] as const

/**
 * The search bar over our own offers.
 *
 * The criteria live in the URL rather than in state: a candidate can bookmark
 * a search, share it, or come back to it with the browser's back button —
 * which is what people do with a job search.
 */
export function OfferSearchForm({ filters }: { filters: OfferSearchFilters }) {
  const router = useRouter()
  const [query, setQuery] = useState(filters.q ?? "")
  const [department, setDepartment] = useState(filters.departement ?? "")
  const [contracts, setContracts] = useState<string[]>(
    (filters.contrat ?? "").split(",").filter(Boolean)
  )
  const [remoteOnly, setRemoteOnly] = useState(filters.teletravail === "1")

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const params = new URLSearchParams()

    if (query.trim()) params.set("q", query.trim())
    if (department.trim()) params.set("departement", department.trim())
    if (contracts.length > 0) params.set("contrat", contracts.join(","))
    if (remoteOnly) params.set("teletravail", "1")

    const suffix = params.toString()
    router.push(suffix ? `/offres?${suffix}` : "/offres")
  }

  const reset = () => {
    setQuery("")
    setDepartment("")
    setContracts([])
    setRemoteOnly(false)
    router.push("/offres")
  }

  /** Whether anything is narrowing the search — what "Réinitialiser" undoes. */
  const filtering =
    query.trim() !== "" ||
    department.trim() !== "" ||
    contracts.length > 0 ||
    remoteOnly

  const toggleContract = (id: string) =>
    setContracts((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id]
    )

  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-60 flex-1 flex-col gap-2">
          <Label htmlFor="offer-query">Mots-clés</Label>
          <Input
            id="offer-query"
            placeholder="développeur react, chef de projet…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="flex w-32 flex-col gap-2">
          <Label htmlFor="offer-department">Département</Label>
          <Input
            id="offer-department"
            placeholder="44"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
          />
        </div>
        <Button type="submit">
          <SearchIcon />
          Rechercher
        </Button>
        <Button
          type="button"
          variant="ghost"
          // Hidden rather than disabled when there is nothing to undo: a
          // permanently greyed-out button reads as broken.
          className={filtering ? undefined : "invisible"}
          onClick={reset}
        >
          <RotateCcwIcon />
          Réinitialiser
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {CONTRACTS.map((contract) => (
          <Button
            key={contract.id}
            type="button"
            size="sm"
            variant={contracts.includes(contract.id) ? "default" : "outline"}
            aria-pressed={contracts.includes(contract.id)}
            onClick={() => toggleContract(contract.id)}
          >
            {contract.label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={remoteOnly ? "default" : "outline"}
          aria-pressed={remoteOnly}
          onClick={() => setRemoteOnly((current) => !current)}
        >
          Télétravail
        </Button>
      </div>
    </form>
  )
}
