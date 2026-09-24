"use client"

import { useEffect, useId, useRef, useState } from "react"
import type { RomeAppellationOption } from "@cvforge/types"

import { comboboxAction } from "@/components/job-market/combobox-keys"
import type { LandingDictionary } from "@/content/types"
import { format } from "@/lib/i18n"
import {
  fetchAppellations,
  MIN_JOB_QUERY_CHARS,
} from "@/lib/job-market-client"
import { cn } from "@/lib/utils"

type Labels = LandingDictionary["jobMarket"]["form"]

/** Long enough to skip the keystrokes of a word being typed. */
const DEBOUNCE_MS = 250

/**
 * The job field: an ARIA combobox over the local ROME referential (US-137).
 * Only an option picked from the list counts; typing again clears the pick,
 * so the page never asks for figures of a job the referential does not know.
 */
export function AppellationCombobox({
  labels,
  selected,
  onSelect,
  disabled,
}: {
  labels: Labels
  selected: RomeAppellationOption | null
  onSelect: (appellation: RomeAppellationOption | null) => void
  disabled: boolean
}) {
  const [query, setQuery] = useState(selected?.libelle ?? "")
  const [options, setOptions] = useState<RomeAppellationOption[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [searching, setSearching] = useState(false)
  const inputId = useId()
  const hintId = useId()
  const listId = useId()
  const statusId = useId()
  const optionId = (index: number) => `${listId}-${index}`
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const term = query.trim()
  const searchable = !selected && term.length >= MIN_JOB_QUERY_CHARS

  useEffect(() => {
    if (!searchable) return

    const controller = new AbortController()
    const timer = setTimeout(() => {
      setSearching(true)
      fetchAppellations(term, controller.signal)
        .then((found) => {
          setOptions(found)
          setActive(-1)
          setOpen(true)
        })
        // A superseded or failed search leaves the list as it was; the
        // visitor keeps typing, and the next one answers.
        .catch(() => undefined)
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [searchable, term])

  function pick(option: RomeAppellationOption) {
    setQuery(option.libelle)
    setOpen(false)
    setActive(-1)
    onSelect(option)
  }

  const status = searching
    ? labels.searching
    : open && searchable
      ? options.length === 0
        ? labels.noMatch
        : format(labels.suggestions, { count: options.length })
      : ""
  const expanded = open && searchable && options.length > 0

  return (
    <div className="relative">
      <label className="block font-medium" htmlFor={inputId}>
        {labels.jobLabel}
      </label>
      <p className="mt-1 text-sm text-muted-foreground" id={hintId}>
        {labels.jobHint}
      </p>
      <input
        aria-activedescendant={
          expanded && active >= 0 ? optionId(active) : undefined
        }
        aria-autocomplete="list"
        aria-controls={listId}
        aria-describedby={`${hintId} ${statusId}`}
        aria-expanded={expanded}
        autoComplete="off"
        className="mt-2 h-11 w-full rounded-lg border bg-background px-3 text-base transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        disabled={disabled}
        id={inputId}
        onBlur={() => {
          // Late enough for a click on an option to land first.
          blurTimer.current = setTimeout(() => setOpen(false), 150)
        }}
        onChange={(event) => {
          setQuery(event.target.value)
          if (selected) onSelect(null)
        }}
        onFocus={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current)
          if (options.length > 0 && searchable) setOpen(true)
        }}
        onKeyDown={(event) => {
          const action = comboboxAction(
            event.key,
            active,
            options.length,
            expanded
          )
          if (!action) return

          event.preventDefault()
          if (action.type === "move") {
            setOpen(true)
            setActive(action.index)
          } else if (action.type === "pick") {
            pick(options[action.index]!)
          } else {
            setOpen(false)
          }
        }}
        placeholder={labels.jobPlaceholder}
        role="combobox"
        type="text"
        value={query}
      />
      <p aria-live="polite" className="sr-only" id={statusId} role="status">
        {status}
      </p>
      {open && searchable && options.length === 0 && !searching ? (
        <p className="mt-2 text-sm text-muted-foreground">{labels.noMatch}</p>
      ) : null}
      <ul
        className={cn(
          "absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-raised",
          !expanded && "hidden"
        )}
        id={listId}
        role="listbox"
      >
        {options.map((option, index) => (
          <li
            aria-selected={index === active}
            className={cn(
              "flex min-h-11 cursor-pointer flex-col justify-center rounded-md px-3 py-1.5",
              index === active && "bg-accent text-accent-foreground"
            )}
            id={optionId(index)}
            key={option.code}
            onMouseDown={(event) => {
              // Keeps the focus in the field: the pick lands before any blur.
              event.preventDefault()
              pick(option)
            }}
            onMouseEnter={() => setActive(index)}
            role="option"
          >
            <span>{option.libelle}</span>
            <span className="text-xs text-muted-foreground">
              {option.metierCode} · {option.metierLibelle}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
