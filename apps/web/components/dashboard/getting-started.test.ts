import { emptySearchProject } from "@cvforge/types"
import { describe, expect, it } from "vitest"

import { gettingStartedItems } from "@/components/dashboard/getting-started"
import { createEmptyProfile } from "@/lib/profile-model"

const blank = createEmptyProfile("jane@example.com")
const ready = {
  ...blank,
  identity: { ...blank.identity, firstName: "Jane" },
  meta: { ...blank.meta, source: "storage" as const },
  sections: { ...blank.sections, technicalSkills: ["SQL"] },
}

function doneIds(items: ReturnType<typeof gettingStartedItems>) {
  return items.filter((item) => item.done).map((item) => item.id)
}

describe("gettingStartedItems", () => {
  it("has nothing done for a brand-new account, and sends it to the onboarding", () => {
    const items = gettingStartedItems({
      applications: 0,
      interviews: 0,
      profile: blank,
      project: emptySearchProject(blank.id),
      rome: [],
    })

    expect(doneIds(items)).toEqual([])
    expect(items[0].href).toBe("/bienvenue")
  })

  it("ticks what the account holds", () => {
    const items = gettingStartedItems({
      applications: 2,
      interviews: 1,
      profile: ready,
      project: {
        ...emptySearchProject(ready.id),
        digestEnabled: true,
        updatedAt: "2026-09-25T10:00:00.000Z",
      },
      rome: [
        {
          code: "1",
          libelle: "Développeur",
          metierCode: "M1805",
          metierLibelle: "Études et développement informatique",
          score: 0.9,
          status: "confirmed",
        },
      ],
    })

    expect(doneIds(items)).toEqual([
      "profil",
      "criteres",
      "metiers",
      "alertes",
      "candidature",
      "entretien",
    ])
    expect(items[0].href).toBe(`/profile/${ready.id}`)
    expect(items[1].href).toContain(`profileId=${ready.id}`)
  })
})
