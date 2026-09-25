"use client"

import type { SearchProject, SearchProjectRomeAppellation } from "@cvforge/types"
import { ArrowLeftIcon, ArrowRightIcon, SparklesIcon } from "lucide-react"

import { CriteriaCompaniesSection } from "@/components/job-search/criteria-companies-section"
import { CriteriaJobSection } from "@/components/job-search/criteria-job-section"
import { CriteriaPlaceSection } from "@/components/job-search/criteria-place-section"
import { SearchProjectRome } from "@/components/job-search/search-project-rome"
import { OnboardingShell } from "@/components/onboarding/onboarding-shell"
import { StepRecap } from "@/components/onboarding/step-recap"
import { StepWelcome } from "@/components/onboarding/step-welcome"
import { useOnboardingFlow } from "@/components/onboarding/use-onboarding-flow"
import { ProfileAvailabilityCard } from "@/components/profile/profile-availability-card"
import { ProfileIdentityCard } from "@/components/profile/profile-identity-card"
import { ProfileListCards } from "@/components/profile/profile-list-cards"
import { ProfileSummaryCard } from "@/components/profile/profile-summary-card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  ONBOARDING_STEPS,
  type OnboardingStepId,
} from "@/lib/onboarding-steps"
import type { BaseProfile } from "@/lib/profile-model"

/**
 * The first-login onboarding (US-150): the app's own forms — the profile's
 * cards, the search criteria, the ROME jobs, the alerts — one step at a time,
 * each with a word on why it is asked.
 */
export function OnboardingWizard({
  initialProfile,
  initialProject,
  initialRome,
  initialStep,
  nextPath,
}: {
  initialProfile: BaseProfile
  initialProject: SearchProject
  initialRome: SearchProjectRomeAppellation[]
  initialStep: OnboardingStepId
  nextPath: string | null
}) {
  const flow = useOnboardingFlow({
    nextPath,
    profile: initialProfile,
    project: initialProject,
    rome: initialRome,
    step: initialStep,
  })
  const { profile, project, setCriterion, setProfile } = flow
  const setSection = <K extends keyof BaseProfile["sections"]>(
    key: K,
    value: BaseProfile["sections"][K]
  ) =>
    setProfile((current) => ({
      ...current,
      sections: { ...current.sections, [key]: value },
    }))

  const content: Record<OnboardingStepId, React.ReactNode> = {
    alertes: <StepRecap profile={profile} project={project} rome={flow.rome} />,
    bienvenue: <StepWelcome onImported={flow.importCv} />,
    identite: (
      <>
        <ProfileIdentityCard profile={profile} onChange={setProfile} />
        <ProfileAvailabilityCard
          preferences={profile.preferences}
          onChange={(preferences) =>
            setProfile((current) => ({ ...current, preferences }))
          }
        />
      </>
    ),
    lieu: (
      <>
        <CriteriaPlaceSection project={project} set={setCriterion} />
        <CriteriaCompaniesSection project={project} set={setCriterion} />
      </>
    ),
    metiers: (
      <SearchProjectRome
        key={project.updatedAt ?? "unsaved"}
        profileId={profile.id}
        initialAppellations={flow.rome}
        onChange={flow.setRome}
      />
    ),
    parcours: (
      <>
        <ProfileSummaryCard sections={profile.sections} setSection={setSection} />
        <ProfileListCards sections={profile.sections} setSection={setSection} />
      </>
    ),
    poste: <CriteriaJobSection project={project} set={setCriterion} />,
  }

  return (
    <OnboardingShell
      exitHref="/dashboard"
      index={flow.index}
      step={ONBOARDING_STEPS[flow.index]}
      footer={
        <>
          {flow.index > 0 ? (
            <Button
              type="button"
              variant="ghost"
              disabled={flow.pending}
              onClick={flow.back}
            >
              <ArrowLeftIcon />
              Retour
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" size="lg" disabled={flow.pending} onClick={flow.next}>
            {nextLabel(flow.step, flow.imported)}
            {flow.pending ? (
              <Spinner />
            ) : flow.step === "alertes" ? (
              <SparklesIcon />
            ) : (
              <ArrowRightIcon />
            )}
          </Button>
        </>
      }
    >
      {content[flow.step]}
    </OnboardingShell>
  )
}

function nextLabel(step: OnboardingStepId, imported: boolean) {
  if (step === "bienvenue") {
    return imported ? "Vérifier mes informations" : "Remplir à la main"
  }
  if (step === "lieu") return "Enregistrer et trouver mes métiers"
  if (step === "alertes") return "Accéder à mon tableau de bord"
  return "Continuer"
}
