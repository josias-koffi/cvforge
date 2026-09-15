import type { ImportedCvProfilePatch } from "@cvforge/types"
import { describe, expect, it } from "vitest"

import {
  applyImportedCv,
  buildGenerationRequest,
  createEmptyProfile,
  isProfileReady,
} from "@/lib/profile-model"

function patch(overrides: Partial<ImportedCvProfilePatch["sections"]> = {}): ImportedCvProfilePatch {
  return {
    headline: "Ingénieur IA",
    identity: { city: "", firstName: "Yahse", github: "", linkedIn: "", portfolio: "" },
    sections: {
      certifications: [],
      education: [{ degree: "BTS", honors: "", institution: "Lycée", year: "2025" }],
      experiences: [],
      interests: "",
      personalProjects: [],
      softSkills: [],
      summary: "",
      technicalSkills: ["TypeScript"],
      ...overrides,
    },
  }
}

describe("profile model", () => {
  it("keeps existing values when the imported CV has none", () => {
    const base = createEmptyProfile("me@example.com")
    base.identity.city = "Lille"
    base.sections.softSkills = ["Rigueur"]

    const merged = applyImportedCv(base, patch())

    expect(merged.identity).toMatchObject({ city: "Lille", firstName: "Yahse" })
    expect(merged.headline).toBe("Ingénieur IA")
    expect(merged.sections.softSkills).toEqual(["Rigueur"])
    expect(merged.sections.technicalSkills).toEqual(["TypeScript"])
    expect(merged.sections.education[0].description).toBe("")
  })

  it("requires a first name before generation", () => {
    const profile = createEmptyProfile("me@example.com")

    expect(isProfileReady(profile)).toBe(false)
    profile.identity.firstName = " Yahse "
    expect(isProfileReady(profile)).toBe(true)
  })

  it("keeps personal identifiers out of the prompt profile", () => {
    const profile = createEmptyProfile(" me@example.com ")
    profile.identity = { ...profile.identity, firstName: "Yahse", lastName: "Koffi", phone: "0600" }

    const request = buildGenerationRequest(profile)

    expect(request.localFields).toEqual({ email: "me@example.com", lastName: "Koffi", phone: "0600" })
    expect(JSON.stringify(request.promptProfile)).not.toMatch(/Koffi|0600|me@example/)
    expect(request.promptProfile.identity.candidateToken).toBe("[CANDIDATE]")
  })
})
