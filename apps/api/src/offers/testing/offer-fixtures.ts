import type { CreditOfferInput } from "@cvforge/types";

export function offerInput(overrides: Partial<CreditOfferInput> = {}): CreditOfferInput {
  return {
    credits: 300,
    description: { en: "For a quick start.", fr: "Pour demarrer vite." },
    features: { en: ["Credits never expire"], fr: ["Credits sans expiration"] },
    name: { en: "Discovery", fr: "Decouverte" },
    priceCents: 599,
    slug: "discovery",
    sortOrder: 5,
    status: "active",
    ...overrides,
  };
}
