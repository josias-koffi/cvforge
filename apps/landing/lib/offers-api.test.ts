import type { PublicCreditOffer } from "@cvforge/types"
import { describe, expect, it, vi } from "vitest"

import { apiUrl, fetchPublicOffers } from "@/lib/offers-api"
import { toPackSummaries } from "@/lib/pricing"

const env = (values: Record<string, string>) =>
  values as unknown as NodeJS.ProcessEnv

const offer: PublicCreditOffer = {
  credits: 350,
  currency: "eur",
  description: { en: "", fr: "Pour une recherche active." },
  features: { en: [], fr: ["Paiement unique, sans abonnement"] },
  id: "o-active",
  isFeatured: true,
  name: { en: "Active search", fr: "Recherche active" },
  priceCents: 1490,
  slug: "recherche-active",
  sortOrder: 20,
}

describe("apiUrl", () => {
  it("prefers the internal URL, then the public one, then localhost", () => {
    expect(
      apiUrl(
        env({
          API_INTERNAL_URL: "https://api.internal/",
          NEXT_PUBLIC_API_URL: "https://api.public",
        })
      )
    ).toBe("https://api.internal")
    expect(apiUrl(env({ NEXT_PUBLIC_API_URL: "https://api.public" }))).toBe(
      "https://api.public"
    )
    expect(apiUrl(env({}))).toBe("http://localhost:3333")
  })
})

describe("fetchPublicOffers", () => {
  it("returns the catalogue served by the API", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ offers: [offer] }))

    await expect(
      fetchPublicOffers(env({ API_INTERNAL_URL: "https://api.test" }), fetcher)
    ).resolves.toEqual([offer])
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.test/public/credit-offers",
      { next: { revalidate: 300 } }
    )
  })

  it("returns null when the API fails or is unreachable", async () => {
    await expect(
      fetchPublicOffers(
        env({}),
        vi.fn().mockResolvedValue(new Response("", { status: 502 }))
      )
    ).resolves.toBeNull()
    await expect(
      fetchPublicOffers(env({}), vi.fn().mockRejectedValue(new Error("down")))
    ).resolves.toBeNull()
  })
})

describe("toPackSummaries", () => {
  it("localises offers and falls back to French copy", () => {
    const [fr] = toPackSummaries([offer], "fr")
    const [en] = toPackSummaries([offer], "en")

    expect(fr).toMatchObject({
      applications: 20,
      featured: true,
      features: ["Paiement unique, sans abonnement"],
      label: "Recherche active",
    })
    expect(fr.price).toMatch(/14,90\s€/)
    expect(fr.unitPrice).toMatch(/0,75\s€/)
    expect(en.price).toBe("€14.90")
    expect(en.description).toBe("Pour une recherche active.")
  })
})
