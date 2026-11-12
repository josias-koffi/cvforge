import { describe, expect, it } from "vitest";
import { readOfferPlace } from "./offer-place";

describe("readOfferPlace", () => {
  it("centres the search on the commune of an INSEE code", () => {
    const found = readOfferPlace("44109", "30");

    expect(found?.place).toEqual({
      code: "44109",
      department: "44",
      name: "Nantes",
      radiusKm: 30,
    });
    expect(found?.near.departments).toContain("44");
  });

  it("falls back to 20 km for a radius nobody offered", () => {
    expect(readOfferPlace("44109", "7")?.place.radiusKm).toBe(20);
    expect(readOfferPlace("44109", undefined)?.place.radiusKm).toBe(20);
  });

  it("searches everywhere for a code that is not a commune", () => {
    expect(readOfferPlace("99999", "20")).toBeNull();
    expect(readOfferPlace("nantes", "20")).toBeNull();
    expect(readOfferPlace(undefined, undefined)).toBeNull();
  });

  it("reaches the neighbouring departments a wide circle covers", () => {
    // 50 km around Paris is not Paris alone: Boulogne, Saint-Denis, Créteil.
    expect(readOfferPlace("75056", "50")?.near.departments).toEqual(
      expect.arrayContaining(["75", "92", "93", "94"]),
    );
  });
});
