import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  applyLabel,
  OfferBenefits,
  OfferCompany,
  OfferContact,
  OfferProfile,
  OfferSource,
} from "@/components/job-search/offer-details"
import type { OfferDetails } from "@/lib/job-search"

function details(overrides: Partial<OfferDetails> = {}): OfferDetails {
  return {
    apply: null,
    companyBadges: [],
    companyDescription: "",
    companyWebsite: "",
    contact: null,
    education: [],
    experience: null,
    facts: [],
    lacksCandidates: false,
    languages: [],
    licences: [],
    salary: null,
    sections: [],
    softSkills: [],
    source: "france_travail",
    via: "",
    ...overrides,
  }
}

describe("OfferSource", () => {
  it("always names the source, and the board France Travail relays", () => {
    expect(
      renderToStaticMarkup(
        <OfferSource source="france_travail" via="Meteojob" />
      )
    ).toContain("Source : France Travail · via Meteojob")
  })

  it("names the software behind a company's own board", () => {
    expect(renderToStaticMarkup(<OfferSource source="lever" />)).toContain(
      "Site de l&#x27;entreprise (Lever)"
    )
  })
})

describe("applyLabel", () => {
  it("says where the button leads", () => {
    const apply = (target: "employer" | "partner" | "source") => ({
      host: "www.meteojob.com",
      target,
      url: "https://www.meteojob.com/jobs/1",
    })

    expect(applyLabel(details({ apply: apply("partner") }))).toBe(
      "Postuler sur meteojob.com"
    )
    expect(
      applyLabel(details({ apply: { ...apply("partner"), name: "Meteojob" } }))
    ).toBe("Postuler sur Meteojob")
    expect(applyLabel(details({ apply: apply("employer") }))).toBe(
      "Postuler sur le site de l'employeur"
    )
    expect(applyLabel(details({ apply: apply("source") }))).toBe(
      "Postuler sur France Travail"
    )
  })
})

describe("offer detail sections", () => {
  it("say nothing when the source gave nothing", () => {
    const empty = details()

    for (const Section of [
      OfferBenefits,
      OfferCompany,
      OfferContact,
      OfferProfile,
    ]) {
      expect(renderToStaticMarkup(<Section details={empty} />)).toBe("")
    }
  })

  it("mark each requirement as required or wished for", () => {
    const html = renderToStaticMarkup(
      <OfferProfile
        details={details({
          experience: { comment: "", label: "2 An(s)", required: true },
          languages: [{ label: "Anglais", required: false }],
          softSkills: [
            { description: "Capacité à fédérer.", label: "Leadership" },
          ],
        })}
      />
    )

    expect(html).toContain("Profil recherché")
    expect(html).toContain("2 An(s)")
    expect(html).toContain("Exigé")
    expect(html).toContain("Anglais")
    expect(html).toContain("Souhaité")
    expect(html).toContain("Capacité à fédérer.")
  })

  it("list the benefits that come with the pay", () => {
    const html = renderToStaticMarkup(
      <OfferBenefits
        details={details({
          salary: {
            benefits: ["Véhicule", "Complémentaire santé"],
            comment: "Selon profil",
            label: "",
          },
        })}
      />
    )

    expect(html).toContain("Véhicule")
    expect(html).toContain("Selon profil")
  })

  it("link the contact's e-mail", () => {
    const html = renderToStaticMarkup(
      <OfferContact
        details={details({
          contact: { email: "rh@acme.fr", lines: ["18000 Bourges"], name: "" },
        })}
      />
    )

    expect(html).toContain('href="mailto:rh@acme.fr"')
    expect(html).toContain("18000 Bourges")
  })
})
