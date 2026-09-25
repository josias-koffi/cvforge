import { emptySearchProject } from "@cvforge/types"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock("@/app/bienvenue/actions", () => ({ completeOnboarding: vi.fn() }))
vi.mock("@/app/(app)/profile/actions", () => ({
  importCvFile: vi.fn(),
  saveProfile: vi.fn(),
}))
vi.mock("@/app/(app)/ma-recherche/actions", () => ({
  decideRomeAppellation: vi.fn(),
  findRomeAppellations: vi.fn(),
  prefillSearchProject: vi.fn(),
  saveSearchAlerts: vi.fn(),
  saveSearchProject: vi.fn(),
}))

const { OnboardingWizard } = await import(
  "@/components/onboarding/onboarding-wizard"
)
const { createEmptyProfile } = await import("@/lib/profile-model")
const { ONBOARDING_STEPS } = await import("@/lib/onboarding-steps")

const profile = createEmptyProfile("jane@example.com")

function render(step: (typeof ONBOARDING_STEPS)[number]["id"]) {
  return renderToStaticMarkup(
    <OnboardingWizard
      initialProfile={profile}
      initialProject={emptySearchProject(profile.id)}
      initialRome={[]}
      initialStep={step}
      nextPath={null}
    />
  )
}

describe("OnboardingWizard", () => {
  it("opens with what is ahead and the CV shortcut", () => {
    const html = render("bienvenue")

    expect(html).toContain("Étape 1 sur 7")
    expect(html).toContain("Bienvenue sur CVSpark")
    expect(html).toContain("importez votre CV")
    expect(html).toContain("Remplir à la main")
    expect(html).toContain("Terminer plus tard")
    expect(html).not.toContain("Retour")
  })

  it("renders every step with why it is asked", () => {
    for (const [index, step] of ONBOARDING_STEPS.entries()) {
      const html = render(step.id)

      expect(html).toContain(`Étape ${index + 1} sur 7`)
      expect(html).toContain("Pourquoi on vous le demande")
      expect(html).toContain('aria-current="step"')
    }
  })

  it("keeps the candidate in the flow on the identity step", () => {
    const html = render("identite")

    expect(html).toContain("Disponibilité")
    expect(html).not.toContain("Ce que je cherche")
    expect(html).not.toContain('href="/ma-recherche"')
  })

  it("ends on the dashboard", () => {
    expect(render("alertes")).toContain("Accéder à mon tableau de bord")
    expect(render("lieu")).toContain("Enregistrer et trouver mes métiers")
  })
})
