"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

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
