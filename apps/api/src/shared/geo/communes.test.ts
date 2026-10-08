import { describe, expect, it } from "vitest";
import {
  departmentsWithin,
  findCommuneByCode,
  findCommuneByName,
  haversineKm,
} from "./communes";

describe("communes", () => {
  it("places a commune from its INSEE code, arrondissements included", () => {
    expect(findCommuneByCode("59350")).toMatchObject({
      department: "59",
      name: "Lille",
    });
    expect(findCommuneByCode("75108")?.department).toBe("75");
    expect(findCommuneByCode("00000")).toBeNull();
    expect(findCommuneByCode(undefined)).toBeNull();
  });

  it("reads a bare name as the city, not an arrondissement or a village", () => {
    const paris = findCommuneByName("Paris");

    expect(paris).toMatchObject({ code: "75056", department: "75" });
    expect(findCommuneByName("valence")?.department).toBe("26");
    expect(findCommuneByName("Nowhere-sur-Rien")).toBeNull();
  });

  it("reads a name within the department an offer gives", () => {
    expect(findCommuneByName("Lyon 3e Arrondissement", "69")?.code).toBe(
      "69383",
    );
    expect(findCommuneByName("Saint-Denis", "974")?.department).toBe("974");
  });

  it("finds the departments 25 km around Paris reach", () => {
    const paris = findCommuneByName("Paris")!;

    expect(departmentsWithin(paris.latitude, paris.longitude, 25)).toEqual(
      expect.arrayContaining(["75", "92", "93", "94"]),
    );
    expect(
      departmentsWithin(paris.latitude, paris.longitude, 25),
    ).not.toContain("59");
  });

  it("measures distances in kilometres", () => {
    const lille = findCommuneByCode("59350")!;
    const dunkerque = findCommuneByCode("59183")!;

    expect(
      haversineKm(
        lille.latitude,
        lille.longitude,
        dunkerque.latitude,
        dunkerque.longitude,
      ),
    ).toBeGreaterThan(55);
  });
});
