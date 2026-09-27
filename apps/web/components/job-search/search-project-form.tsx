"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type {
  SearchProject,
  SearchProjectRomeAppellation,
} from "@cvforge/types"
import { CheckIcon, SparklesIcon, WandSparklesIcon } from "lucide-react"
import { toast } from "sonner"

import {
  prefillSearchProject,
  saveSearchProject,
} from "@/app/(app)/ma-recherche/actions"
import { CriteriaCompaniesSection } from "@/components/job-search/criteria-companies-section"
import { CriteriaJobSection } from "@/components/job-search/criteria-job-section"
import { CriteriaPlaceSection } from "@/components/job-search/criteria-place-section"
import {
  companiesSummary,
  jobSummary,
  placeSummary,
  sameCriteria,
  type SetCriterion,
} from "@/components/job-search/search-criteria"
import { searchTabHref } from "@/components/job-search/search-tabs"
import { SectionOutline } from "@/components/layout/section-outline"
import { UnsavedChangesGuard } from "@/components/layout/unsaved-changes-guard"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

/**
 * "Critères": what the offers are searched with, saved with one button.
 *
 * The bar at the bottom says whether anything is left to save — the only
 * thing on this tab that is not applied at once — and the outline on the left
 * sums up each section, so a candidate coming back sees their search without
 * scrolling through it.
 */
export function SearchProjectForm({
  initialProject,
}: {
  initialProject: SearchProject
}) {
  const router = useRouter()
  const [project, setProject] = useState(initialProject)
  const [saved, setSaved] = useState(initialProject)
  const [saving, startSaving] = useTransition()
  const [prefilling, startPrefilling] = useTransition()
  const dirty = !sameCriteria(project, saved)

  const set: SetCriterion = (key, value) =>
    setProject((current) => ({ ...current, [key]: value }))

  const save = () =>
    startSaving(async () => {
      const result = await saveSearchProject(project)

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      setSaved(project)
      notifySaved(result.message, result.rome, () =>
        router.push(searchTabHref("/ma-recherche/metiers", project.profileId))
      )
    })

  const prefill = () =>
    startPrefilling(async () => {
      const result = await prefillSearchProject(project.profileId)

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      // The alerts are not criteria: a prefill never touches them.
      setProject((current) => ({
        ...result.searchProject,
        aiRerankEnabled: current.aiRerankEnabled,
        digestEnabled: current.digestEnabled,
        emailEnabled: current.emailEnabled,
      }))
      toast.success(
        "Critères pré-remplis depuis votre profil. Vérifiez puis enregistrez."
      )
    })

  return (
    // On a large screen the outline and the save bar stay put, and only the
    // cards scroll between them.
    <div className="grid gap-6 px-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[13rem_minmax(0,1fr)] lg:px-6">
      <UnsavedChangesGuard dirty={dirty} />
      <CriteriaOutline project={project} />

      <div className="flex min-w-0 flex-col gap-4 lg:min-h-0">
        <div className="flex flex-col gap-4 *:shrink-0 lg:-mx-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-2 lg:pb-1">
          <CriteriaJobSection
            project={project}
            set={set}
            action={
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={prefilling}
                onClick={prefill}
              >
                {prefilling ? <Spinner /> : <WandSparklesIcon />}
                Pré-remplir depuis mon profil
              </Button>
            }
          />
          <CriteriaPlaceSection project={project} set={set} />
          <CriteriaCompaniesSection project={project} set={set} />
        </div>

        <SaveBar
          dirty={dirty}
          saving={saving}
          onReset={() => setProject(saved)}
          onSave={save}
        />
      </div>
    </div>
  )
}

/** Found ROME jobs are not applied yet: the toast leads to where they are. */
function notifySaved(
  message: string | undefined,
  rome: SearchProjectRomeAppellation[],
  openJobs: () => void
) {
  const suggested = rome.filter((entry) => entry.status === "suggested").length

  if (suggested === 0) {
    toast.success(message)
    return
  }

  toast.success(message, {
    action: { label: "Voir les métiers", onClick: openJobs },
    description: `${suggested} métier${suggested > 1 ? "s" : ""} à confirmer.`,
  })
}

function CriteriaOutline({ project }: { project: SearchProject }) {
  return (
    <div className="hidden lg:block">
      <SectionOutline
        label="Sections des critères"
        items={[
          { detail: jobSummary(project), id: "poste", label: "Le poste" },
          {
            detail: placeSummary(project),
            id: "lieu",
            label: "Lieu et salaire",
          },
          {
            detail: companiesSummary(project),
            id: "entreprises",
            label: "Secteurs et entreprises",
          },
        ]}
      />
    </div>
  )
}

function SaveBar({
  dirty,
  saving,
  onReset,
  onSave,
}: {
  dirty: boolean
  saving: boolean
  onReset: () => void
  onSave: () => void
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:rounded-lg lg:border lg:shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          aria-live="polite"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          {dirty ? (
            <>
              <span className="size-2 rounded-full bg-warning" />
              Modifications non enregistrées
            </>
          ) : (
            <>
              <CheckIcon className="size-4" />
              Tout est enregistré
            </>
          )}
        </p>
        <div className="flex gap-2">
          {dirty ? (
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={onReset}
            >
              Annuler
            </Button>
          ) : null}
          <Button type="button" disabled={!dirty || saving} onClick={onSave}>
            {saving ? <Spinner /> : <SparklesIcon />}
            Enregistrer mes critères
          </Button>
        </div>
      </div>
    </div>
  )
}
