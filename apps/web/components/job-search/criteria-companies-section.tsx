"use client"

import type { SearchProject } from "@cvforge/types"

import { SectionCard, FieldHint } from "@/components/layout/section-card"
import type { SetCriterion } from "@/components/job-search/search-criteria"
import {
  ChipGroup,
  LinesTextarea,
} from "@/components/job-search/search-project-fields"
import {
  SECTOR_OPTIONS,
  SIZE_OPTIONS,
  VALUE_OPTIONS,
} from "@/components/job-search/search-project-options"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

/** Sectors and companies: every filter here is optional. */
export function CriteriaCompaniesSection({
  project,
  set,
}: {
  project: SearchProject
  set: SetCriterion
}) {
  return (
    <SectionCard
      id="entreprises"
      title="Secteurs et entreprises"
      description="Tout est facultatif : laissez vide pour ne rien exclure."
    >
      <ChipGroup
        label="Secteurs recherchés"
        options={SECTOR_OPTIONS}
        selected={project.sectors}
        onChange={(next) => set("sectors", next)}
      />
      <ChipGroup
        label="Secteurs à éviter"
        options={SECTOR_OPTIONS}
        selected={project.excludedSectors}
        onChange={(next) => set("excludedSectors", next)}
      />

      <Separator />

      <ChipGroup
        label="Taille de l'entreprise"
        options={SIZE_OPTIONS}
        selected={project.companySizes}
        onChange={(next) => set("companySizes", next)}
      />
      <ChipGroup
        label="Engagements"
        options={VALUE_OPTIONS}
        selected={project.companyValues}
        onChange={(next) => set("companyValues", next)}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor="excluded-companies">Entreprises à exclure</Label>
        <LinesTextarea
          id="excluded-companies"
          placeholder={"Mon employeur actuel\nUne entreprise déjà contactée"}
          values={project.excludedCompanies}
          onChange={(next) => set("excludedCompanies", next)}
        />
        <FieldHint>Une par ligne.</FieldHint>
      </div>
    </SectionCard>
  )
}
