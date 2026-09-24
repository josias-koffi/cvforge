import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { OfferSkills } from "@/components/job-search/offer-skills"
import type { JobCardOffer } from "@/lib/job-search"

function offer(overrides: Partial<JobCardOffer> = {}, romeCode?: string) {
  return {
    aiReason: null,
    job: { romeCode } as JobCardOffer["job"],
    listings: [],
    matchedSkills: ["TypeScript", "Concevoir une application web", "React"],
    missingSkills: ["Tests unitaires et d'intégration"],
    score: 72,
    status: "new",
    ...overrides,
  } as JobCardOffer
}

describe("OfferSkills", () => {
  it("names what the candidate has and what to bring forward, citing France Travail", () => {
    const html = renderToStaticMarkup(
      <OfferSkills offer={offer({}, "M1805")} />
    )

    expect(html).toContain("Vous avez")
    expect(html).toContain("Concevoir une application web")
    expect(html).toContain("À mettre en avant")
    expect(html).toContain("Tests unitaires et d&#x27;intégration")
    expect(html).toContain("sans jamais l&#x27;inventer")
    expect(html).toContain("Source : ROME 4.0, France Travail")
  })

  it("does not cite France Travail for an offer without ROME data", () => {
    expect(renderToStaticMarkup(<OfferSkills offer={offer()} />)).not.toContain(
      "France Travail"
    )
  })

  it("stays on two short lines on a card", () => {
    const html = renderToStaticMarkup(<OfferSkills offer={offer()} compact />)

    expect(html).toContain("TypeScript, Concevoir une application web +1")
    expect(html).toContain("À mettre en avant")
  })

  it("shows nothing for an offer found by searching", () => {
    expect(
      renderToStaticMarkup(
        <OfferSkills
          offer={offer({ matchedSkills: undefined, missingSkills: undefined })}
        />
      )
    ).toBe("")
    expect(
      renderToStaticMarkup(
        <OfferSkills offer={offer({ missingSkills: [] })} compact />
      )
    ).not.toContain("À mettre en avant")
  })
})
