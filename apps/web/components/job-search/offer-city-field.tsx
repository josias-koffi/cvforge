"use client"

import { useId, useState } from "react"
import { MapPinIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Commune } from "@/hooks/use-commune-search"
import { cn } from "@/lib/utils"

/**
 * A city, typed and picked from the official directory's suggestions.
 *
 * A combobox in the ARIA sense: the arrows walk the list, Enter picks,
 * Escape closes it. The suggestions are passed in, so the bar can also use
 * the first one when the candidate types "Nantes" and submits without
 * picking.
 */
export function OfferCityField({
  value,
  onValueChange,
  matches,
  onPick,
  className,
}: {
  value: string
  onValueChange: (value: string) => void
  matches: Commune[]
  onPick: (commune: Commune) => void
  className?: string
}) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const expanded = open && matches.length > 0
  const highlighted = Math.min(active, matches.length - 1)

  const pick = (commune: Commune) => {
    setOpen(false)
    onPick(commune)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!expanded) return

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      const step = event.key === "ArrowDown" ? 1 : -1
      setActive((highlighted + step + matches.length) % matches.length)
    } else if (event.key === "Enter") {
      const commune = matches[highlighted]

      if (commune) {
        // Picking, not submitting: the pick runs the search itself.
        event.preventDefault()
        pick(commune)
      }
    } else if (event.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div className={cn("relative", className)}>
      <Label htmlFor={`${listId}-input`} className="sr-only">
        Ville
      </Label>
      <MapPinIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={`${listId}-input`}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={
          expanded ? `${listId}-${matches[highlighted]?.code}` : undefined
        }
        autoComplete="off"
        placeholder="Ville"
        className="h-11 border-0 pr-9 pl-9 text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
        value={value}
        onChange={(event) => {
          onValueChange(event.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {value ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Effacer la ville"
          className="absolute top-1/2 right-1 size-8 -translate-y-1/2"
          onClick={() => onValueChange("")}
        >
          <XIcon />
        </Button>
      ) : null}

      {expanded ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Villes"
          className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-lg border bg-popover py-1 text-sm text-popover-foreground shadow-md"
        >
          {matches.map((commune, index) => (
            <li
              key={commune.code}
              id={`${listId}-${commune.code}`}
              role="option"
              aria-selected={index === highlighted}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 aria-selected:bg-accent aria-selected:text-accent-foreground"
              // Before the input's blur, which would close the list first.
              onMouseDown={(event) => {
                event.preventDefault()
                pick(commune)
              }}
              onMouseEnter={() => setActive(index)}
            >
              <MapPinIcon className="size-3.5 text-muted-foreground" />
              <span className="flex-1">{commune.nom}</span>
              {commune.departement?.code ? (
                <span className="text-xs text-muted-foreground">
                  {commune.departement.code}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
