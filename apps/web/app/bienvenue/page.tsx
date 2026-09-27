import type { Metadata } from "next"

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard"
import { safeNextPath } from "@/lib/next-path"
import { initialStep } from "@/lib/onboarding-steps"
import { loadRegistry } from "@/lib/profile"
import { pickProfile } from "@/lib/profile-model"
import { loadSearchProject } from "@/lib/search-project"
import { requireSession } from "@/lib/session"

export const metadata: Metadata = { title: "Bienvenue" }

/**
 * The first-login onboarding (US-150), full screen and outside the app's
 * shell. It opens on the first thing still missing, so "Reprendre" from the
 * dashboard lands where the candidate left off.
 */
export default async function WelcomePage(props: PageProps<"/bienvenue">) {
  const session = await requireSession()
  const params = await props.searchParams
  const profile = pickProfile(await loadRegistry(session.email))
  const { rome, searchProject } = await loadSearchProject(profile.id)

  return (
    <OnboardingWizard
      initialProfile={profile}
      initialProject={searchProject}
      initialRome={rome}
      initialStep={initialStep(params.etape, profile, searchProject)}
      nextPath={safeNextPath(params.next)}
    />
  )
}
