"use client"

import { useEffect, useRef, useState } from "react"
import { DEFAULT_SEARCH_RADIUS_KM, type SearchLocation } from "@cvforge/types"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

/** One entry per line, blank lines and surrounding spaces ignored. */
export function fromLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

/**
 * A list typed one entry per line.
 *
 * The raw text is kept as typed: rebuilding it from the parsed list on every
 * keystroke trimmed the space being typed and swallowed Enter, so "Ingénieur
 * logiciel" could only be pasted, never typed. The list is re-read from the
 * text; the text is only replaced when the list changes from outside (prefill).
 */
export function LinesTextarea({
  id,
  placeholder,
  values,
  onChange,
}: {
  id: string
  placeholder: string
  values: string[]
  onChange: (next: string[]) => void
}) {
  const [text, setText] = useState(() => values.join("\n"))

  if (fromLines(text).join("\n") !== values.join("\n")) {
    setText(values.join("\n"))
  }

  return (
    <Textarea
      id={id}
      rows={3}
      placeholder={placeholder}
      value={text}
      onChange={(event) => {
        setText(event.target.value)
        onChange(fromLines(event.target.value))
      }}
    />
  )
}

/** A multiple-choice row of chips. Selecting is additive, never exclusive. */
export function ChipGroup<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: ReadonlyArray<{ id: T; label: string }>
  selected: readonly T[]
  onChange: (next: T[]) => void
}) {
  const toggle = (id: T) =>
    onChange(
      selected.includes(id)
        ? selected.filter((entry) => entry !== id)
        : [...selected, id]
    )

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option.id)

          return (
            <Button
              key={option.id}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              aria-pressed={active}
              onClick={() => toggle(option.id)}
            >
              {option.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

type Commune = {
  code: string
  nom: string
  departement?: { code: string }
  centre?: { coordinates: [number, number] }
}

const GEO_API = "https://geo.api.gouv.fr/communes"
const SEARCH_DEBOUNCE_MS = 250

/**
 * Where the candidate wants to work, picked from the official commune
 * directory so the INSEE code and the department come with it — those are what
 * the job sources are queried with, not the typed label.
 */
export function LocationPicker({
  locations,
  onChange,
}: {
  locations: SearchLocation[]
  onChange: (next: SearchLocation[]) => void
}) {
  const [query, setQuery] = useState("")
  const [matches, setMatches] = useState<Commune[]>([])
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const term = query.trim()

    if (term.length < 2) return

    const timer = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const url = `${GEO_API}?nom=${encodeURIComponent(term)}&fields=departement,centre&boost=population&limit=5`
        const response = await fetch(url, { signal: controller.signal })
        setMatches(response.ok ? ((await response.json()) as Commune[]) : [])
      } catch {
        // Offline or aborted: the field still accepts a plain city name.
        setMatches([])
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query])

  const add = (commune: Commune) => {
    const [longitude, latitude] = commune.centre?.coordinates ?? [null, null]

    if (locations.some((entry) => entry.inseeCode === commune.code)) return

    onChange([
      ...locations,
      {
        department: commune.departement?.code ?? "",
        inseeCode: commune.code,
        label: commune.nom,
        latitude,
        longitude,
        radiusKm: DEFAULT_SEARCH_RADIUS_KM,
      },
    ])
    setQuery("")
    setMatches([])
  }

  const setRadius = (inseeCode: string, radiusKm: number) =>
    onChange(
      locations.map((entry) =>
        entry.inseeCode === inseeCode ? { ...entry, radiusKm } : entry
      )
    )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="search-commune">Ajouter une ville</Label>
        <Input
          id="search-commune"
          autoComplete="off"
          placeholder="Nantes, Lyon, Paris…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            if (event.target.value.trim().length < 2) setMatches([])
          }}
        />
        {matches.length > 0 && (
          <ul className="divide-y divide-border rounded-md border border-border bg-popover text-sm">
            {matches.map((commune) => (
              <li key={commune.code}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-accent"
                  onClick={() => add(commune)}
                >
                  {commune.nom}
                  <span className="text-muted-foreground">
                    {commune.departement?.code
                      ? ` (${commune.departement.code})`
                      : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ul className="flex flex-col gap-2">
        {locations.map((location) => (
          <li
            key={location.inseeCode || location.label}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
          >
            <span className="flex-1">
              {location.label}
              {location.department ? ` (${location.department})` : ""}
            </span>
            <Label
              className="text-muted-foreground"
              htmlFor={`radius-${location.inseeCode || location.label}`}
            >
              Rayon
            </Label>
            <Input
              id={`radius-${location.inseeCode || location.label}`}
              className="w-20"
              type="number"
              min={1}
              max={200}
              value={location.radiusKm}
              onChange={(event) =>
                setRadius(location.inseeCode, Number(event.target.value))
              }
            />
            <span className="text-muted-foreground">km</span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={`Retirer ${location.label}`}
              onClick={() =>
                onChange(locations.filter((entry) => entry !== location))
              }
            >
              <X className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
