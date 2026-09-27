import type { SearchProject } from "@cvforge/types"

import {
  CONTRACT_OPTIONS,
  REMOTE_LABELS,
} from "@/components/job-search/search-project-options"

export type SetCriterion = <K extends keyof SearchProject>(
  key: K,
  value: SearchProject[K]
) => void

/** Unsaved when anything differs but the save date the server stamps. */
export function sameCriteria(a: SearchProject, b: SearchProject) {
  return (
    JSON.stringify({ ...a, updatedAt: null }) ===
    JSON.stringify({ ...b, updatedAt: null })
  )
}

function plural(count: number, word: string) {
  return `${count} ${word}${count > 1 ? "s" : ""}`
}

/** One line per section, for the outline and the alerts' reminder. */
export function jobSummary(project: SearchProject) {
  if (project.targetRoles.length === 0) return "Aucun poste renseigné"

  const contracts = CONTRACT_OPTIONS.filter((option) =>
    project.contractTypes.includes(option.id)
  ).map((option) => option.label)

  return [plural(project.targetRoles.length, "poste"), ...contracts].join(" · ")
}

export function placeSummary(project: SearchProject) {
  const [first, ...others] = project.locations
  const place = project.nationalMobility
    ? "Toute la France"
    : first
      ? `${first.label} + ${first.radiusKm} km${others.length > 0 ? ` et ${plural(others.length, "autre")}` : ""}`
      : "Aucune ville"

  return project.remote === "any"
    ? place
    : `${place} · ${REMOTE_LABELS[project.remote]}`
}

export function companiesSummary(project: SearchProject) {
  const filters =
    project.sectors.length +
    project.excludedSectors.length +
    project.companySizes.length +
    project.companyValues.length +
    project.excludedCompanies.length

  return filters === 0 ? "Aucun filtre" : plural(filters, "filtre")
}
