"use client"

import { DRIVING_LICENSE_CATEGORIES, normalizeDrivingLicenses } from "@cvforge/types"

import { ChipGroup } from "@/components/ui/chip-group"

const OPTIONS = DRIVING_LICENSE_CATEGORIES.map((category) => ({
  id: category,
  label: category,
}))

/** The licence categories, ticked in any order but always kept in licence order. */
export function DrivingLicenseField({
  value,
  onChange,
}: {
  value: string[] | undefined
  onChange: (next: string[]) => void
}) {
  return (
    <ChipGroup
      label="Permis de conduire"
      options={OPTIONS}
      selected={normalizeDrivingLicenses(value)}
      onChange={(next) => onChange(normalizeDrivingLicenses(next))}
    />
  )
}
