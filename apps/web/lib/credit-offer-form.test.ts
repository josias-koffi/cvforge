import type { AdminCreditOffer } from "@cvforge/types"
import { describe, expect, it } from "vitest"

import {
  buildOfferInput,
  emptyOfferForm,
  offerToForm,
  parsePriceToCents,
  slugify,
  type CreditOfferFormValues,
} from "./credit-offer-form"

function validForm(overrides: Partial<CreditOfferFormValues> = {}): CreditOfferFormValues {
  return {
    ...emptyOfferForm(),
    credits: "550",
    features: { en: [" Credits never expire ", ""], fr: ["Crédits sans expiration"] },
    name: { en: "Starter", fr: "Démarrage" },
    price: "9,99",
    ...overrides,
  }
}

describe("parsePriceToCents", () => {
  it.each([
    ["9,99", 999],
    ["9.9", 990],
    ["10", 1000],
    [" 1 000,50 ", 100050],
  ])("parses %j", (value, cents) => {
    expect(parsePriceToCents(value)).toBe(cents)
  })

  it.each(["", "abc", "9,999", "-5"])("rejects %j", (value) => {
    expect(parsePriceToCents(value)).toBeNull()
  })
})

describe("slugify", () => {
  it("builds a URL-safe identifier", () => {
    expect(slugify("  À propos du Pack Pro ! ")).toBe("a-propos-du-pack-pro")
  })
})

describe("buildOfferInput", () => {
  it("cleans the form into an API payload and derives the slug", () => {
    expect(buildOfferInput(validForm())).toEqual({
      ok: true,
      input: {
        credits: 550,
        description: { en: "", fr: "" },
        features: { en: ["Credits never expire"], fr: ["Crédits sans expiration"] },
        name: { en: "Starter", fr: "Démarrage" },
        priceCents: 999,
        slug: "demarrage",
        sortOrder: 0,
        status: "draft",
      },
    })
  })

  it.each([
    [{ name: { en: "", fr: "Pro" } }, /nom/],
    [{ credits: "0" }, /crédits/],
    [{ credits: "1.5" }, /crédits/],
    [{ price: "4,99" }, /5 €/],
    [{ sortOrder: "-1" }, /ordre/],
  ])("rejects %j", (overrides, message) => {
    const result = buildOfferInput(validForm(overrides as Partial<CreditOfferFormValues>))

    expect(result.ok).toBe(false)
    expect(!result.ok && result.message).toMatch(message)
  })

  it("round-trips an existing offer", () => {
    const offer: AdminCreditOffer = {
      createdAt: "2026-09-17T10:00:00.000Z",
      credits: 1400,
      currency: "eur",
      description: { en: "Active search", fr: "Recherche active" },
      features: { en: [], fr: ["TVA incluse"] },
      id: "o1",
      isFeatured: true,
      name: { en: "Pro", fr: "Pro" },
      priceCents: 1999,
      slug: "pro",
      sortOrder: 20,
      status: "active",
      stripePriceId: "price_1",
      stripeProductId: "prod_1",
      stripeSyncedAt: null,
      updatedAt: "2026-09-17T10:00:00.000Z",
    }

    const form = offerToForm(offer)

    expect(form.price).toBe("19,99")
    expect(form.features.en).toEqual([""])
    expect(buildOfferInput(form)).toMatchObject({
      input: { credits: 1400, priceCents: 1999, slug: "pro", sortOrder: 20, status: "active" },
      ok: true,
    })
  })
})
