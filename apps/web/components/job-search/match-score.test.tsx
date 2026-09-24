import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  MatchScoreDetail,
  MatchScoreSummary,
} from "@/components/job-search/match-score"
import { TooltipProvider } from "@/components/ui/tooltip"
import { criterionPoints, matchLevel, SCORE_CRITERIA } from "@/lib/match-score"

const breakdown = {
  experience: 10,
  freshness: 12,
  location: 15,
  salary: 0,
  skills: 10.4,
  title: 18,
}

describe("matchLevel", () => {
  it("puts the score in words before the number", () => {
    expect(matchLevel(82).label).toBe("Très bonne correspondance")
    expect(matchLevel(75).label).toBe("Très bonne correspondance")
    expect(matchLevel(65).label).toBe("Bonne correspondance")
    expect(matchLevel(40).label).toBe("Correspondance partielle")
  })
})

describe("criterionPoints", () => {
  it("reads each criterion out of its own weight, which add up to 100", () => {
    const skills = SCORE_CRITERIA.find(
      (criterion) => criterion.key === "skills"
    )!

    expect(criterionPoints(breakdown, skills)).toEqual({
      percent: 40,
      points: 10,
    })
    expect(SCORE_CRITERIA.reduce((total, c) => total + c.weight, 0)).toBe(100)
  })
})

describe("MatchScoreSummary", () => {
  it("shows the verdict, the percentage and a gauge — never a bare 65/100", () => {
    const html = renderToStaticMarkup(
      <TooltipProvider>
        <MatchScoreSummary score={65} />
      </TooltipProvider>
    )

    expect(html).toContain("Bonne correspondance")
    expect(html).toContain("65 %")
    expect(html).toContain('role="meter"')
    expect(html).toContain("Comment ce score est-il calculé ?")
    expect(html).not.toContain("/100")
  })
})

describe("MatchScoreDetail", () => {
  it("explains the score criterion by criterion, with the AI's reason", () => {
    const html = renderToStaticMarkup(
      <MatchScoreDetail
        score={65}
        breakdown={breakdown}
        aiReason="Poste proche de vos cibles."
      />
    )

    expect(html).toContain("Pourquoi cette offre ?")
    expect(html).toContain("Poste proche de vos cibles.")
    expect(html).toContain("Intitulé du poste")
    expect(html).toContain("18 / 30")
    expect(html).toContain("Salaire")
    expect(html).toContain("0 / 5")
  })

  it("keeps the overall gauge when an older selection has no breakdown", () => {
    const html = renderToStaticMarkup(
      <MatchScoreDetail score={48} breakdown={null} aiReason={null} />
    )

    expect(html).toContain("Correspondance partielle")
    expect(html).not.toContain("Intitulé du poste")
  })
})
