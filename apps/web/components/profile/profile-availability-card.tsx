"use client"

import Link from "next/link"
import { SearchIcon } from "lucide-react"

import { FieldGrid, SpecField } from "@/components/documents/list-editor"
import { FieldHint, SectionCard } from "@/components/layout/section-card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import type { ProfilePreferences } from "@/lib/profile-model"

/**
 * When the candidate can start. What they are looking for is not here: it has
 * its own page, which feeds the daily offers.
 */
export function ProfileAvailabilityCard({
  preferences,
  onChange,
}: {
  preferences: ProfilePreferences
  onChange: (next: ProfilePreferences) => void
}) {
  const immediate = preferences.availabilityMode === "immediate"

  return (
    <SectionCard
      id="disponibilite"
      title="Disponibilité"
      description="Quand vous pouvez commencer : elle apparaît sur vos candidatures."
      action={
        <Button asChild size="sm" variant="ghost">
          <Link href="/ma-recherche">
            <SearchIcon />
            Ce que je cherche
          </Link>
        </Button>
      }
    >
      <label className="flex items-center gap-3 text-sm">
        <Switch
          checked={immediate}
          onCheckedChange={(checked) =>
            onChange({
              ...preferences,
              availabilityDate: checked ? "" : preferences.availabilityDate,
              availabilityMode: checked ? "immediate" : "",
            })
          }
        />
        Disponible immédiatement
      </label>
      {immediate ? null : (
        <FieldGrid>
          <SpecField
            id="preferences"
            spec={{ key: "availabilityDate", label: "Disponible à partir du" }}
            value={preferences.availabilityDate}
            onChange={(value) =>
              onChange({
                ...preferences,
                availabilityDate: value as string,
                availabilityMode: (value as string).trim() ? "date" : "",
              })
            }
          />
        </FieldGrid>
      )}
      <FieldHint>
        Postes, contrats, lieux et secteurs visés se règlent dans « Ma recherche
        ».
      </FieldHint>
    </SectionCard>
  )
}
