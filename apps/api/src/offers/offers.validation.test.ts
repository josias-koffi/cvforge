import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { parseCreditOfferInput } from "./offers.validation";
import { offerInput } from "./testing/offer-fixtures";

describe("parseCreditOfferInput", () => {
  it("normalises a valid payload", () => {
    const parsed = parseCreditOfferInput({
      ...offerInput(),
      features: { en: [" A ", ""], fr: ["B"] },
      name: { en: " Discovery ", fr: "Decouverte" },
      slug: "Discovery-2",
      sortOrder: undefined,
    });

    expect(parsed).toMatchObject({
      features: { en: ["A"], fr: ["B"] },
      name: { en: "Discovery", fr: "Decouverte" },
      slug: "discovery-2",
      sortOrder: 0,
    });
  });

  it.each([
    [{ slug: "bad slug" }, /identifiant/],
    [{ name: { en: "", fr: "Nom" } }, /Le nom \(EN\)/],
    [{ credits: 0 }, /credits/],
    [{ priceCents: 499 }, /prix/],
    [{ priceCents: 9.5 }, /prix/],
    [{ status: "deleted" }, /statut/],
    [{ description: { en: "x".repeat(281), fr: "" } }, /280/],
    [{ features: { en: Array(13).fill("x"), fr: [] } }, /12 lignes/],
  ])("rejects %j", (overrides, message) => {
    expect(() => parseCreditOfferInput({ ...offerInput(), ...overrides })).toThrow(message);
    expect(() => parseCreditOfferInput({ ...offerInput(), ...overrides })).toThrow(
      BadRequestException,
    );
  });

  it("rejects a non-object body", () => {
    expect(() => parseCreditOfferInput(null)).toThrow(BadRequestException);
  });
});
