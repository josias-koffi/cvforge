import { describe, expect, it } from "vitest";
import { normalizeDrivingLicenses } from "./driving-license";

describe("normalizeDrivingLicenses", () => {
  it("keeps known categories once, in licence order", () => {
    expect(normalizeDrivingLicenses(["B", " a ", "B", "CE", "Z", 3])).toEqual(["A", "B", "CE"]);
  });

  it("reads anything that is not a list as no licence", () => {
    expect(normalizeDrivingLicenses(undefined)).toEqual([]);
    expect(normalizeDrivingLicenses("B")).toEqual([]);
  });
});
