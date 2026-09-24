import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { OfferCard } from "@/components/job-search/offer-card"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { JobCardOffer } from "@/lib/job-search"

function offer(overrides: Partial<JobCardOffer> = {}) {
  return {
    aiReason: null,
    job: {
      companyAnonymous: false,
      companyName: "acme",
      contractType: "cdi",
      firstSeenAt: "2026-09-20T08:00:00Z",
      locationLabel: "Nantes",
      publishedAt: null,
      remote: true,
      salaryLabel: "45 k€",
      title: "Développeur TypeScript",
    } as JobCardOffer["job"],
    listings: [],
    score: null,
    status: "new",
    ...overrides,
  } as JobCardOffer
}

function render(card: JobCardOffer) {
  const noop = () => undefined

  return renderToStaticMarkup(
    <TooltipProvider>
      <OfferCard
        offer={card}
        onOpen={noop}
        onSave={noop}
        onDismiss={noop}
        pending={false}
      />
    </TooltipProvider>
  )
}

describe("OfferCard", () => {
  it("names its actions in words, with no bare cross to guess at", () => {
    const html = render(offer())

    expect(html).toContain("Garder")
    expect(html).toContain("Pas pour moi")
    expect(html).toContain("lucide-thumbs-down")
    expect(html).not.toContain("lucide-x")
  })

  it("shows the facts to compare, and the company's initial", () => {
    const html = render(offer())

    expect(html).toContain("Développeur TypeScript")
    expect(html).toContain("Nantes")
    expect(html).toContain("CDI")
    expect(html).toContain("Télétravail")
    expect(html).toContain("45 k€")
    expect(html).toContain(">A<")
  })

  it("leaves the score out of an offer nothing ranked", () => {
    expect(render(offer())).not.toContain("correspondance")
    expect(render(offer({ score: 80 }))).toContain("Très bonne correspondance")
  })

  it("does not offer to keep an offer already kept", () => {
    const html = render(offer({ status: "saved" }))

    expect(html).toContain("Gardée")
    expect(html).not.toContain("lucide-bookmark")
  })
})
