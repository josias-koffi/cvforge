import { describe, expect, it } from "vitest"

import { profileOutline } from "@/components/profile/profile-sections"
import { createEmptyProfile, type BaseProfile } from "@/lib/profile-model"

function outline(profile: BaseProfile) {
  return Object.fromEntries(
    profileOutline(profile).map(({ detail, done, id }) => [
      id,
      { detail, done },
    ])
  )
}

describe("profileOutline", () => {
  it("lists every card, in their order, all to fill on a new profile", () => {
    const empty = createEmptyProfile("lea@example.com")
    const items = profileOutline(empty)

    expect(items.map(({ id }) => id)).toEqual([
      "identite",
      "resume",
      "experiences",
      "formation",
      "projets",
      "langues",
      "certifications",
      "disponibilite",
    ])
    expect(items.every(({ done }) => done === false)).toBe(true)
    expect(outline(empty).experiences.detail).toBe("À compléter")
    expect(outline(empty).disponibilite.detail).toBe("Non précisée")
  })

  it("counts what each section holds", () => {
    const base = createEmptyProfile("lea@example.com")
    const profile: BaseProfile = {
      ...base,
      identity: { ...base.identity, firstName: "Léa", lastName: "Moreau" },
      preferences: { ...base.preferences, availabilityMode: "immediate" },
      sections: {
        ...base.sections,
        experiences: [
          { company: "A", period: "", results: "", role: "Dev" },
          { company: "B", period: "", results: "", role: "Dev" },
        ],
        languages: [{ language: "Anglais", level: "C1" }],
        softSkills: ["Écoute"],
        technicalSkills: ["TypeScript", "React"],
      },
    }
    const items = outline(profile)

    expect(items.identite).toEqual({ detail: "Léa Moreau", done: true })
    expect(items.resume).toEqual({ detail: "3 compétences", done: true })
    expect(items.experiences).toEqual({ detail: "2 expériences", done: true })
    expect(items.langues).toEqual({ detail: "1 langue", done: true })
    expect(items.disponibilite).toEqual({ detail: "Immédiate", done: true })
  })
})
