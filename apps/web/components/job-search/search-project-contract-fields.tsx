"use client"

import type {
  ApprenticeshipPreferences,
  InternshipPreferences,
} from "@cvforge/types"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * What a placement needs that a permanent contract does not: when it starts,
 * how long it lasts, and — for an alternance — the rhythm the school imposes.
 *
 * Shown only when the candidate ticked the matching contract, so somebody
 * looking for a CDI never sees a form about their school.
 */

const MAX_DURATION_MONTHS = 36

export function InternshipFields({
  value,
  onChange,
}: {
  value: InternshipPreferences | null
  onChange: (next: InternshipPreferences) => void
}) {
  const current: InternshipPreferences = value ?? {
    durationMonths: null,
    schoolLevel: "",
    startDate: "",
  }

  return (
    <fieldset className="border-border flex flex-col gap-3 rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">Votre stage</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field htmlFor="internship-start" label="Début souhaité">
          <Input
            id="internship-start"
            type="date"
            value={current.startDate}
            onChange={(event) =>
              onChange({ ...current, startDate: event.target.value })
            }
          />
        </Field>
        <Field htmlFor="internship-duration" label="Durée (mois)">
          <Input
            id="internship-duration"
            type="number"
            min={1}
            max={MAX_DURATION_MONTHS}
            value={current.durationMonths ?? ""}
            onChange={(event) =>
              onChange({
                ...current,
                durationMonths: Number(event.target.value) || null,
              })
            }
          />
        </Field>
        <Field htmlFor="internship-level" label="Niveau d'études">
          <Input
            id="internship-level"
            placeholder="Bac+5"
            value={current.schoolLevel}
            onChange={(event) =>
              onChange({ ...current, schoolLevel: event.target.value })
            }
          />
        </Field>
      </div>
    </fieldset>
  )
}

export function ApprenticeshipFields({
  value,
  onChange,
}: {
  value: ApprenticeshipPreferences | null
  onChange: (next: ApprenticeshipPreferences) => void
}) {
  const current: ApprenticeshipPreferences = value ?? {
    contractKind: "any",
    diploma: "",
    durationMonths: null,
    rhythm: "",
    schoolName: "",
    startDate: "",
  }

  return (
    <fieldset className="border-border flex flex-col gap-3 rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">Votre alternance</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field htmlFor="apprenticeship-start" label="Début souhaité">
          <Input
            id="apprenticeship-start"
            type="date"
            value={current.startDate}
            onChange={(event) =>
              onChange({ ...current, startDate: event.target.value })
            }
          />
        </Field>
        <Field
          htmlFor="apprenticeship-rhythm"
          label="Rythme"
          hint="Tel que votre école l'annonce"
        >
          <Input
            id="apprenticeship-rhythm"
            placeholder="3j/2j"
            value={current.rhythm}
            onChange={(event) => onChange({ ...current, rhythm: event.target.value })}
          />
        </Field>
        <Field htmlFor="apprenticeship-diploma" label="Diplôme préparé">
          <Input
            id="apprenticeship-diploma"
            placeholder="Master MIAGE"
            value={current.diploma}
            onChange={(event) => onChange({ ...current, diploma: event.target.value })}
          />
        </Field>
      </div>
    </fieldset>
  )
}

function Field({
  children,
  htmlFor,
  hint,
  label,
}: {
  children: React.ReactNode
  htmlFor: string
  hint?: string
  label: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  )
}
