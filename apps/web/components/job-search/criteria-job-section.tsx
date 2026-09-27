"use client"

import { searchExperienceLevels, type SearchProject } from "@cvforge/types"

import { SectionCard, FieldHint } from "@/components/layout/section-card"
import type { SetCriterion } from "@/components/job-search/search-criteria"
import {
  ApprenticeshipFields,
  InternshipFields,
} from "@/components/job-search/search-project-contract-fields"
import {
  ChipGroup,
  LinesTextarea,
} from "@/components/job-search/search-project-fields"
import {
  CONTRACT_OPTIONS,
  EXPERIENCE_LABELS,
} from "@/components/job-search/search-project-options"
import { Label } from "@/components/ui/label"

const EXPERIENCE_OPTIONS = searchExperienceLevels.map((level) => ({
  id: level,
  label: EXPERIENCE_LABELS[level],
}))

/** The job: the titles searched with, the level, the contracts. */
export function CriteriaJobSection({
  action,
  project,
  set,
}: {
  action?: React.ReactNode
  project: SearchProject
  set: SetCriterion
}) {
  return (
    <SectionCard
      id="poste"
      title="Le poste"
      description="Ce que vous cherchez, dans les mots des annonces."
      action={action}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="target-roles">Postes visés</Label>
        <LinesTextarea
          id="target-roles"
          placeholder={"Développeur Full Stack\nIngénieur logiciel"}
          values={project.targetRoles}
          onChange={(next) => set("targetRoles", next)}
        />
        <FieldHint>
          Un intitulé par ligne. Ce sont eux qui servent à chercher, et
          d&apos;eux que nous déduisons vos métiers.
        </FieldHint>
      </div>

      <ChipGroup
        label="Niveau d'expérience"
        options={EXPERIENCE_OPTIONS}
        selected={project.experienceLevel ? [project.experienceLevel] : []}
        onChange={(next) =>
          set(
            "experienceLevel",
            next.find((level) => level !== project.experienceLevel) ?? null
          )
        }
      />

      <ChipGroup
        label="Types de contrat"
        options={CONTRACT_OPTIONS}
        selected={project.contractTypes}
        onChange={(next) => set("contractTypes", next)}
      />

      {project.contractTypes.includes("stage") ? (
        <InternshipFields
          value={project.internship}
          onChange={(next) => set("internship", next)}
        />
      ) : null}

      {project.contractTypes.includes("alternance") ? (
        <ApprenticeshipFields
          value={project.apprenticeship}
          onChange={(next) => set("apprenticeship", next)}
        />
      ) : null}
    </SectionCard>
  )
}
