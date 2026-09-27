import { emptySearchProject } from "@cvforge/types"
import { describe, expect, it } from "vitest"

import {
  initialStep,
  isOnboardingStep,
  missingForStep,
  ONBOARDING_STEPS,
  stepIndex,
} from "@/lib/onboarding-steps"
import { createEmptyProfile, type BaseProfile } from "@/lib/profile-model"

function storedProfile(overrides: {
  firstName?: string
  lastName?: string
  skills?: string[]
}): BaseProfile {
  const profile = createEmptyProfile("jane@example.com")

  return {
    ...profile,
    identity: {
      ...profile.identity,
      firstName: overrides.firstName ?? "",
      lastName: overrides.lastName ?? "",
    },
    meta: { ...profile.meta, source: "storage" },
    sections: { ...profile.sections, technicalSkills: overrides.skills ?? [] },
  }
}

const project = emptySearchProject("p1")
const savedProject = { ...project, updatedAt: "2026-09-25T10:00:00.000Z" }

describe("initialStep", () => {
  it("opens on the step in the address when it is one", () => {
    expect(initialStep("lieu", storedProfile({}), project)).toBe("lieu")
  })

  it("opens a never saved profile on the welcome screen", () => {
    expect(
      initialStep(undefined, createEmptyProfile("jane@example.com"), project)
    ).toBe("bienvenue")
    expect(initialStep("nowhere", createEmptyProfile("a@b.fr"), project)).toBe(
      "bienvenue"
    )
  })

  it("resumes on the first thing still missing", () => {
    expect(initialStep(undefined, storedProfile({}), project)).toBe("identite")
    expect(
      initialStep(undefined, storedProfile({ firstName: "Jane" }), project)
    ).toBe("parcours")

    const ready = storedProfile({ firstName: "Jane", skills: ["SQL"] })

    expect(initialStep(undefined, ready, project)).toBe("poste")
    expect(initialStep(undefined, ready, savedProject)).toBe("metiers")
  })
})

describe("missingForStep", () => {
  it("asks for a first and last name on the identity step", () => {
    expect(
      missingForStep("identite", storedProfile({ firstName: "Jane" }), project)
    ).toMatch(/prénom et votre nom/)
    expect(
      missingForStep(
        "identite",
        storedProfile({ firstName: "Jane", lastName: "Doe" }),
        project
      )
    ).toBeNull()
  })

  it("asks for at least one job title on the job step", () => {
    expect(missingForStep("poste", storedProfile({}), project)).toMatch(
      /poste visé/
    )
    expect(
      missingForStep("poste", storedProfile({}), {
        ...project,
        targetRoles: ["Développeur"],
      })
    ).toBeNull()
  })

  it("lets the optional steps through", () => {
    expect(missingForStep("parcours", storedProfile({}), project)).toBeNull()
  })
})

describe("steps", () => {
  it("knows its own ids and their order", () => {
    expect(isOnboardingStep("metiers")).toBe(true)
    expect(isOnboardingStep(["metiers"])).toBe(false)
    expect(stepIndex("bienvenue")).toBe(0)
    expect(stepIndex("alertes")).toBe(ONBOARDING_STEPS.length - 1)
  })

  it("explains every step", () => {
    for (const step of ONBOARDING_STEPS) {
      expect(step.why.length).toBeGreaterThan(20)
      expect(step.tip.length).toBeGreaterThan(20)
    }
  })
})
