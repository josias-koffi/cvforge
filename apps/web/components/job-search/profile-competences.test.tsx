import type { ProfileRomeCompetence } from "@cvforge/types"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/app/(app)/ma-recherche/actions", () => ({
  dismissProfileCompetence: vi.fn(),
}))

const { CompetenceGroups, ProfileCompetences } =
  await import("@/components/job-search/profile-competences")

const AGILE: ProfileRomeCompetence = {
  code: "113277",
  libelle: "Méthode AGILE",
  score: 0.84,
  type: "SAVOIR",
}
const WEB_APP: ProfileRomeCompetence = {
  code: "109846",
  libelle: "Concevoir une application web",
  score: 0.75,
  type: "COMPETENCE-DETAILLEE",
}
const AUTONOMY: ProfileRomeCompetence = {
  code: "300",
  libelle: "Faire preuve d'autonomie",
  score: 0.86,
  type: "MACRO-SAVOIR-ETRE-PROFESSIONNEL",
}

function renderGroups(competences: ProfileRomeCompetence[]) {
  return renderToStaticMarkup(
    <CompetenceGroups
      competences={competences}
      disabled={false}
      onRemove={() => {}}
    />
  )
}

describe("CompetenceGroups", () => {
  it("sends to the profile while nothing was read yet", () => {
    const html = renderGroups([])

    expect(html).toContain("Enregistrez")
    expect(html).toContain('href="/profile"')
  })

  it("groups savoir-faire, savoir-être, then knowledge, each removable", () => {
    const html = renderGroups([AGILE, WEB_APP, AUTONOMY])

    expect(html.indexOf("Savoir-faire")).toBeLessThan(
      html.indexOf("Savoir-être")
    )
    expect(html.indexOf("Savoir-être")).toBeLessThan(
      html.indexOf("Connaissances")
    )
    expect(html).toContain('aria-label="Retirer Méthode AGILE"')
    expect(html).toContain('aria-label="Retirer Concevoir une application web"')
  })

  it("leaves out a group that has nothing in it", () => {
    const html = renderGroups([AGILE])

    expect(html).toContain("Connaissances")
    expect(html).not.toContain("Savoir-faire")
    expect(html).not.toContain("Savoir-être")
  })
})

describe("ProfileCompetences", () => {
  it("cites France Travail, as the licence asks", () => {
    const html = renderToStaticMarkup(
      <ProfileCompetences profileId="p1" initialCompetences={[AGILE]} />
    )

    expect(html).toContain("Vos compétences")
    expect(html).toContain("Source : ROME 4.0, France Travail")
  })
})
