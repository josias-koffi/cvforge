import type { SearchProject, SearchProjectRomeAppellation } from "@cvforge/types"
import { CircleCheckIcon, CircleDashedIcon } from "lucide-react"

import {
  jobSummary,
  placeSummary,
} from "@/components/job-search/search-criteria"
import { SearchProjectAlerts } from "@/components/job-search/search-project-alerts"
import { profileOutline } from "@/components/profile/profile-sections"
import type { BaseProfile } from "@/lib/profile-model"

/**
 * The last step: the morning alerts, reused as they are on "Ma recherche",
 * then what the candidate set up — so they leave knowing it is all there.
 */
export function StepRecap({
  profile,
  project,
  rome,
}: {
  profile: BaseProfile
  project: SearchProject
  rome: SearchProjectRomeAppellation[]
}) {
  const confirmed = rome.filter((entry) => entry.status === "confirmed")
  const lines = [
    ...profileOutline(profile)
      .slice(0, 3)
      .map(({ detail, done, label }) => ({ detail, done, label })),
    {
      detail: jobSummary(project),
      done: project.targetRoles.length > 0,
      label: "Poste visé",
    },
    {
      detail: placeSummary(project),
      done: project.locations.length > 0 || project.nationalMobility,
      label: "Lieu et salaire",
    },
    {
      detail:
        confirmed.length > 0
          ? confirmed.map((entry) => entry.libelle).join(", ")
          : "Aucun métier confirmé",
      done: confirmed.length > 0,
      label: "Métiers",
    },
  ]

  return (
    <>
      <SearchProjectAlerts
        confirmedJobs={confirmed.length}
        initialAlerts={{
          aiRerankEnabled: project.aiRerankEnabled,
          digestEnabled: project.digestEnabled,
          emailEnabled: project.emailEnabled,
        }}
        profileId={project.profileId}
        project={project}
      />

      <section
        aria-labelledby="recap"
        className="rounded-xl border bg-card p-5 shadow-surface"
      >
        <h2 id="recap" className="mb-3 font-medium">
          Votre espace en un coup d&apos;œil
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {lines.map(({ detail, done, label }) => (
            <li key={label} className="flex gap-2.5">
              {done ? (
                <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
              ) : (
                <CircleDashedIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0">
                <span className="block text-sm font-medium">{label}</span>
                <span className="block truncate text-sm text-muted-foreground">
                  {detail}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
