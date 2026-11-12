"use client"

import { useState } from "react"
import { SearchIcon, XIcon } from "lucide-react"

import { PendingContent } from "@/components/feedback/pending-content"
import { OfferCityField } from "@/components/job-search/offer-city-field"
import { useOfferSearch } from "@/components/job-search/offer-search-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type Commune, useCommuneSearch } from "@/hooks/use-commune-search"
import {
  DEFAULT_RADIUS_KM,
  SEARCH_RADII_KM,
  withFilters,
} from "@/lib/offer-search"

/**
 * What and where: the words, a city, how far around it.
 *
 * The words are applied on Enter, not on each key: a search takes a server
 * round-trip, and one per letter would leave the candidate watching a loader
 * while they type. Picking a city searches at once — it is the end of a
 * gesture, like ticking a box.
 */
export function OfferSearchBar() {
  const { filters, pending, placeName, search } = useOfferSearch()
  const [query, setQuery] = useState(filters.q ?? "")
  const [cityText, setCityText] = useState(placeName ?? "")
  const [radius, setRadius] = useState(
    filters.rayon ?? String(DEFAULT_RADIUS_KM)
  )
  const { matches } = useCommuneSearch(cityText)

  // Back to what the URL says when it changes elsewhere: a chip removed, the
  // browser's Back button. Adjusted during render, as React recommends over
  // an effect. Only the bar's own criteria count: ticking a filter must not
  // wipe words typed and not sent yet.
  const fromUrl = [filters.q, filters.ville, filters.rayon, placeName].join(
    "\n"
  )
  const [asked, setAsked] = useState(fromUrl)

  if (asked !== fromUrl) {
    setAsked(fromUrl)
    setQuery(filters.q ?? "")
    setCityText(filters.ville ? (placeName ?? cityText) : "")
    setRadius(filters.rayon ?? String(DEFAULT_RADIUS_KM))
  }

  const searchAround = (
    commune: { code: string; name: string } | null,
    nextRadius = radius
  ) =>
    search(
      withFilters(filters, {
        // Older links searched by department; a city replaces it.
        departement: undefined,
        q: query.trim(),
        rayon: commune ? nextRadius : undefined,
        ville: commune?.code,
      }),
      commune ? { place: commune } : undefined
    )

  const named = (commune: Commune) => ({
    code: commune.code,
    name: commune.nom,
  })

  /** The city the field means: the one searched, or the first suggestion. */
  const currentCity = () => {
    const text = cityText.trim()

    if (!text) return null
    if (filters.ville && placeName === text) {
      return { code: filters.ville, name: placeName }
    }

    return matches[0] ? named(matches[0]) : null
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const city = currentCity()

    if (city) setCityText(city.name)
    searchAround(city)
  }

  const pick = (commune: Commune) => {
    setCityText(commune.nom)
    searchAround(named(commune))
  }

  const changeRadius = (next: string) => {
    setRadius(next)
    // Around a city already searched, a new radius is a new search.
    if (filters.ville && placeName && cityText.trim() === placeName) {
      searchAround({ code: filters.ville, name: placeName }, next)
    }
  }

  return (
    <form
      role="search"
      aria-label="Rechercher une offre"
      onSubmit={submit}
      className="flex flex-col gap-2 rounded-xl border bg-card p-2 shadow-xs @2xl/main:flex-row @2xl/main:items-center"
    >
      <div className="relative flex-1">
        <Label htmlFor="offer-query" className="sr-only">
          Métier, mots-clés ou entreprise
        </Label>
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="offer-query"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder="Métier, mots-clés ou entreprise"
          className="h-11 border-0 pr-9 pl-9 text-base shadow-none focus-visible:ring-0 dark:bg-transparent [&::-webkit-search-cancel-button]:hidden"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Effacer les mots-clés"
            className="absolute top-1/2 right-1 size-8 -translate-y-1/2"
            onClick={() => setQuery("")}
          >
            <XIcon />
          </Button>
        ) : null}
      </div>

      <div className="flex items-center gap-1 border-t pt-2 @2xl/main:w-80 @2xl/main:border-t-0 @2xl/main:border-l @2xl/main:pt-0">
        <OfferCityField
          className="flex-1"
          value={cityText}
          onValueChange={setCityText}
          matches={matches}
          onPick={pick}
        />
        <Select value={radius} onValueChange={changeRadius}>
          <SelectTrigger
            aria-label="Rayon autour de la ville"
            className="border-0 shadow-none data-[size=default]:h-9 dark:bg-transparent"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {SEARCH_RADII_KM.map((km) => (
              <SelectItem key={km} value={String(km)}>
                {km} km
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" size="lg" className="h-11 px-6" disabled={pending}>
        <PendingContent pending={pending} pendingLabel="Recherche…">
          <SearchIcon />
          Rechercher
        </PendingContent>
      </Button>
    </form>
  )
}
