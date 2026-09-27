"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { SearchProject, SearchProjectRomeAppellation } from "@cvforge/types"
import { toast } from "sonner"

import { completeOnboarding } from "@/app/bienvenue/actions"
import {
  prefillSearchProject,
  saveSearchAlerts,
  saveSearchProject,
} from "@/app/(app)/ma-recherche/actions"
import { saveProfile } from "@/app/(app)/profile/actions"
import type { SetCriterion } from "@/components/job-search/search-criteria"
import { normalizeProfile } from "@/components/profile/normalize-profile"
import {
  missingForStep,
  ONBOARDING_STEPS,
  stepIndex,
  type OnboardingStepId,
} from "@/lib/onboarding-steps"
import type { BaseProfile } from "@/lib/profile-model"

type Initial = {
  profile: BaseProfile
  project: SearchProject
  rome: SearchProjectRomeAppellation[]
  step: OnboardingStepId
  nextPath: string | null
}

/**
 * The onboarding's state and its saves. The profile is saved on leaving each
 * of its steps — the search project hangs off a stored profile — and the
 * criteria on leaving "Lieu", which is when ROMEO reads them into jobs.
 */
export function useOnboardingFlow(initial: Initial) {
  const router = useRouter()
  const [step, setStep] = useState(initial.step)
  const [profile, setProfile] = useState(initial.profile)
  const [project, setProject] = useState(initial.project)
  const [rome, setRome] = useState(initial.rome)
  const [imported, setImported] = useState(false)
  const [pending, startTransition] = useTransition()
  const index = stepIndex(step)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    params.set("etape", step)
    window.history.replaceState(null, "", `?${params.toString()}`)
    window.scrollTo({ top: 0 })
  }, [step])

  const goTo = (id: OnboardingStepId) => setStep(id)
  const advance = () => goTo(ONBOARDING_STEPS[index + 1]?.id ?? step)
  const back = () => goTo(ONBOARDING_STEPS[Math.max(index - 1, 0)].id)

  const setCriterion: SetCriterion = (key, value) =>
    setProject((current) => ({ ...current, [key]: value }))

  const importCv = (update: (profile: BaseProfile) => BaseProfile) => {
    setProfile(update)
    setImported(true)
  }

  async function persistProfile() {
    const normalized = normalizeProfile(profile)
    const result = await saveProfile(normalized)

    if (!result.ok) {
      toast.error(result.message)
      return false
    }

    setProfile({ ...normalized, meta: { ...normalized.meta, source: "storage" } })
    return true
  }

  /** Arriving on "Poste" with nothing typed: start from the profile. */
  async function prefillIfEmpty() {
    if (project.updatedAt !== null || project.targetRoles.length > 0) return

    const result = await prefillSearchProject(profile.id)

    if (result.ok) setProject(result.searchProject)
  }

  async function persistProject() {
    const firstSave = project.updatedAt === null
    const result = await saveSearchProject(project)

    if (!result.ok) {
      toast.error(result.message)
      return false
    }

    setProject((current) => ({ ...current, updatedAt: new Date().toISOString() }))
    setRome(result.rome)
    if (firstSave) await enableMorningOffers()
    return true
  }

  /**
   * A new search starts with its offers of the day on: the last step shows
   * the switch, so turning them off stays one click away.
   */
  async function enableMorningOffers() {
    const result = await saveSearchAlerts(project.profileId, {
      aiRerankEnabled: project.aiRerankEnabled,
      digestEnabled: true,
      emailEnabled: project.emailEnabled,
    })

    if (result.ok) setProject((current) => ({ ...current, ...result.alerts }))
  }

  async function finish() {
    const result = await completeOnboarding()

    if (!result.ok) {
      toast.error(result.message)
      return
    }

    toast.success("Votre espace est prêt. Bonne recherche !")
    router.push(initial.nextPath ?? "/dashboard")
  }

  const next = () =>
    startTransition(async () => {
      const missing = missingForStep(step, profile, project)

      if (missing) {
        toast.error(missing)
        return
      }

      if (step === "identite" || step === "parcours") {
        if (!(await persistProfile())) return
        if (step === "parcours") await prefillIfEmpty()
      }

      if (step === "lieu" && !(await persistProject())) return
      if (step === "alertes") return finish()

      advance()
    })

  return {
    back,
    imported,
    importCv,
    index,
    next,
    pending,
    profile,
    project,
    rome,
    setCriterion,
    setProfile,
    setRome,
    step,
  }
}
