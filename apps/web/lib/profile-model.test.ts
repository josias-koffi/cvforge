import type { ImportedCvProfilePatch } from "@cvforge/types"
import { describe, expect, it } from "vitest"

import {
  applyImportedCv,
  buildGenerationRequest,
  countCompletedSections,
  createEmptyProfile,
  duplicateBaseProfile,
  isProfileReady,
  pickProfile,
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

  it("requires a first name and some substance before generation", () => {
    const profile = createEmptyProfile("me@example.com")

    expect(isProfileReady(profile)).toBe(false)

    // A name alone leaves the model nothing but the job offer to work from.
    profile.identity.firstName = " Yahse "
    expect(isProfileReady(profile)).toBe(false)

    profile.sections.technicalSkills = ["TypeScript"]
    expect(isProfileReady(profile)).toBe(true)
  })

  it("keeps personal identifiers out of the prompt profile", () => {
    const profile = createEmptyProfile(" me@example.com ")
    profile.identity = { ...profile.identity, firstName: "Yahse", lastName: "Koffi", phone: "0600" }

    const request = buildGenerationRequest(profile)

    // Links travel with the identifiers so the model never guesses a profile URL.
    expect(request.localFields).toEqual({
      email: "me@example.com",
      github: "",
      lastName: "Koffi",
      linkedin: "",
      phone: "0600",
    })
    expect(JSON.stringify(request.promptProfile)).not.toMatch(/Koffi|0600|me@example/)
    expect(request.promptProfile.identity.candidateToken).toBe("[CANDIDATE]")
  })

  it("picks the requested profile, else the default one", () => {
    const main = createEmptyProfile("me@example.com")
    const backend = createEmptyProfile("me@example.com", "Back-end")
    const registry = { activeProfileId: backend.id, profiles: [main, backend], version: 2 as const }

    expect(pickProfile(registry, main.id)).toBe(main)
    expect(pickProfile(registry)).toBe(backend)
    expect(pickProfile(registry, "unknown")).toBe(backend)
    expect(pickProfile({ ...registry, activeProfileId: "gone" })).toBe(main)
  })

  it("duplicates a profile as an independent, unsaved copy", () => {
    const original = createEmptyProfile("me@example.com", "Back-end")
    original.sections.experiences = [{ company: "Acme", period: "2024", results: "", role: "Dev" }]
    original.meta.lastSavedAt = "2026-01-01T00:00:00.000Z"

    const copy = duplicateBaseProfile(original)
    copy.sections.experiences[0].company = "Other"

    expect(copy.id).not.toBe(original.id)
    expect(copy.label).toBe("Back-end (copie)")
    expect(copy.meta.lastSavedAt).toBeNull()
    expect(original.sections.experiences[0].company).toBe("Acme")
  })

  it("counts the filled editor sections", () => {
    const profile = createEmptyProfile("me@example.com")
    expect(countCompletedSections(profile)).toBe(0)

    profile.sections.technicalSkills = ["TypeScript"]
    profile.sections.certifications = [{ issuer: "AWS", title: "SAA", year: "2025" }]
    expect(countCompletedSections(profile)).toBe(2)
  })
})
