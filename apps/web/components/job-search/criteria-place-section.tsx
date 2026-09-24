"use client"

import { searchRemoteModes, type SearchProject } from "@cvforge/types"

import { SectionCard, FieldHint } from "@/components/layout/section-card"
import type { SetCriterion } from "@/components/job-search/search-criteria"
import {
  ChipGroup,
  LocationPicker,
} from "@/components/job-search/search-project-fields"
import { REMOTE_LABELS } from "@/components/job-search/search-project-options"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

const REMOTE_OPTIONS = searchRemoteModes.map((mode) => ({
  id: mode,
  label: REMOTE_LABELS[mode],
}))

/** Where, how far, how remote — and the salary, asked for alongside. */
export function CriteriaPlaceSection({
  project,
  set,
}: {
  project: SearchProject
  set: SetCriterion
}) {
  return (
    <SectionCard
      id="lieu"
      title="Lieu et salaire"
      description="Les villes que vous acceptez, et jusqu'où vous êtes prêt à aller."
    >
      <LocationPicker
        locations={project.locations}
        onChange={(next) => set("locations", next)}
      />

      <label className="flex items-center gap-3 text-sm">
        <Switch
          checked={project.nationalMobility}
          onCheckedChange={(checked) => set("nationalMobility", checked)}
        />
        Mobile partout en France
      </label>

      <ChipGroup
        label="Télétravail"
        options={REMOTE_OPTIONS}
        selected={[project.remote]}
        onChange={(next) =>
          set("remote", next.find((mode) => mode !== project.remote) ?? "any")
        }
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="salary-min">Salaire brut annuel minimum</Label>
        <div className="flex items-center gap-2">
          <Input
            id="salary-min"
            className="max-w-40"
            type="number"
            min={0}
            step={1000}
            placeholder="45000"
            value={project.salaryMinYearly ?? ""}
            onChange={(event) =>
              set("salaryMinYearly", Number(event.target.value) || null)
            }
          />
          <span className="text-sm text-muted-foreground">€ / an</span>
        </div>
        <FieldHint>
          Facultatif. La plupart des annonces taisent le salaire : il fait
          monter une offre, il n&apos;en écarte jamais.
        </FieldHint>
      </div>
    </SectionCard>
  )
}
