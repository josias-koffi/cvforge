import type { SearchLocation } from "@cvforge/types";
import { describe, expect, it } from "vitest";
import { placeLocation } from "./search-location";

const TYPED: SearchLocation = {
  department: "",
  inseeCode: "",
  label: "Paris",
  latitude: null,
  longitude: null,
  radiusKm: 25,
};

describe("placeLocation", () => {
  it("places a city typed in the profile", () => {
    expect(placeLocation(TYPED)).toMatchObject({
      department: "75",
      inseeCode: "75056",
      label: "Paris",
      radiusKm: 25,
    });
    expect(placeLocation(TYPED).latitude).toBeCloseTo(48.86, 1);
  });

  it("places a commune from its code first", () => {
    expect(
      placeLocation({ ...TYPED, inseeCode: "59183", label: "Dunkerque" })
        .department,
    ).toBe("59");
  });

  it("keeps a location already placed", () => {
    const lille = {
      ...TYPED,
      department: "59",
      inseeCode: "59350",
      label: "Lille",
      latitude: 50.63,
      longitude: 3.05,
    };

    expect(placeLocation(lille)).toBe(lille);
  });

  it("leaves a name it does not know as it is", () => {
    const unknown = { ...TYPED, label: "Quelque part" };

    expect(placeLocation(unknown)).toEqual(unknown);
  });
});
