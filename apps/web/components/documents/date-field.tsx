"use client"

import { useState } from "react"
import {
  getMonthNames,
  legacyToPartialDate,
  parsePartialDate,
  serializePartialDate,
  type Locale,
} from "@cvforge/types"

import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Precision = "year" | "month" | "day"

const PRECISIONS: { label: string; value: Precision }[] = [
  { label: "Année", value: "year" },
  { label: "Mois et année", value: "month" },
  { label: "Jour, mois et année", value: "day" },
]

type Draft = { day: string; month: string; precision: Precision; year: string }

function toDraft(value: string, legacy: string): Draft {
  const parsed = parsePartialDate(value || legacyToPartialDate(legacy))
  return {
    day: parsed?.day ? String(parsed.day) : "",
    month: parsed?.month ? String(parsed.month) : "",
    precision: parsed?.day ? "day" : parsed?.month ? "month" : "year",
    year: parsed ? String(parsed.year) : "",
  }
}

/** Valeur ISO partielle, ou "" tant que la saisie n'est pas une date valide. */
export function draftToValue(draft: Draft): string {
  if (!/^\d{4}$/.test(draft.year)) return ""
  const year = Number(draft.year)
  const month = draft.precision === "year" ? undefined : Number(draft.month) || undefined
  if (draft.precision !== "year" && month === undefined) return ""
  const day = draft.precision === "day" ? Number(draft.day) || undefined : undefined
  if (draft.precision === "day" && day === undefined) return ""
  const value = serializePartialDate({ day, month, year })
  return parsePartialDate(value) ? value : ""
}

type DateFieldProps = {
  disabled?: boolean
  id: string
  label: string
  /** Ancien texte libre, affiché tant qu'aucune date structurée n'est définie. */
  legacy: string
  locale: Locale
  onChange: (value: string) => void
  value: string
}

export function DateField({ disabled, id, label, legacy, locale, onChange, value }: DateFieldProps) {
  const [draft, setDraft] = useState(() => toDraft(value, legacy))
  const months = getMonthNames(locale)

  // Valeur modifiée de l'extérieur (import, restauration) : on réaligne la saisie.
  const [seen, setSeen] = useState(value)
  if (value !== seen) {
    setSeen(value)
    if (value !== draftToValue(draft)) setDraft(toDraft(value, legacy))
  }

  const apply = (next: Draft) => {
    setDraft(next)
    // Une saisie incomplète ne touche pas aux données ; seul un champ année vidé les efface.
    const nextValue = draftToValue(next)
    if (nextValue || next.year === "") onChange(nextValue)
  }

  return (
    <Field>
      <FieldLabel htmlFor={`${id}-year`}>{label}</FieldLabel>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          disabled={disabled}
          value={draft.precision}
          onValueChange={(precision) => apply({ ...draft, precision: precision as Precision })}
        >
          <SelectTrigger aria-label={`${label} : précision`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRECISIONS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {draft.precision === "day" && (
          <Input
            aria-label={`${label} : jour`}
            className="w-16"
            disabled={disabled}
            inputMode="numeric"
            maxLength={2}
            placeholder="JJ"
            value={draft.day}
            onChange={(event) => apply({ ...draft, day: event.target.value.replace(/\D/g, "") })}
          />
        )}
        {draft.precision !== "year" && (
          <Select
            disabled={disabled}
            value={draft.month}
            onValueChange={(month) => apply({ ...draft, month })}
          >
            <SelectTrigger aria-label={`${label} : mois`}>
              <SelectValue placeholder="Mois" />
            </SelectTrigger>
            <SelectContent>
              {months.map((name, index) => (
                <SelectItem key={name} value={String(index + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Input
          id={`${id}-year`}
          className="w-20"
          disabled={disabled}
          inputMode="numeric"
          maxLength={4}
          placeholder="AAAA"
          value={draft.year}
          onChange={(event) => apply({ ...draft, year: event.target.value.replace(/\D/g, "") })}
        />
      </div>
      {!value && legacy && (
        <p className="text-xs text-muted-foreground">
          Valeur actuelle : « {legacy} ». Choisissez une date pour la remplacer.
        </p>
      )}
    </Field>
  )
}

export function CurrentCheckbox({
  checked,
  id,
  onChange,
}: {
  checked: boolean
  id: string
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(state) => onChange(state === true)} />
      <label htmlFor={id} className="text-sm">
        En cours
      </label>
    </div>
  )
}
