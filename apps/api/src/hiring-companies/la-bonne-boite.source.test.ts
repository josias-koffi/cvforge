import { describe, expect, it } from "vitest";
import type { FtHttpClient, FtRequest } from "../france-travail/ft-http.client";
import type { FtResult } from "../france-travail/ft-result";
import { placeKey, placeOf, placeQuery } from "./hiring-places";
import { LaBonneBoiteSource } from "./la-bonne-boite.source";

/** Trimmed from the live answer of 2026-09-24, M1805 around Nantes. */
const ANSWER = {
  hits: 47,
  items: [
    {
      city: "Nantes",
      company_name: "EVERIENCE",
      department_number: "44",
      email: "yes",
      headcount_max: 199,
      headcount_min: 100,
      hiring_potential: 25.7,
      is_high_potential: false,
      location: { lat: 47.2228, lon: -1.55718 },
      naf: "6202A",
      naf_label: "Conseil en systèmes et logiciels informatiques",
      office_name: "",
      postcode: "44000",
      siret: "38198356800092",
    },
    {
      city: "Nantes",
      company_name: "CGI FRANCE",
      email: "no",
      headcount_max: 0,
      headcount_min: 0,
      hiring_potential: 13.2,
      is_high_potential: true,
      office_name: "CGI Nantes",
      siret: "70204275500844",
    },
    { company_name: "SANS SIRET", siret: "" },
  ],
  resolved_params: {
    jobs: [{ display: "Développeur / Développeuse informatique", value: "M1805" }],
  },
};

function source(result: FtResult<unknown>) {
  const calls: FtRequest[] = [];
  const franceTravail = {
    isEnabled: () => true,
    request: async (_id: string, request: FtRequest) => {
      calls.push(request);
      return result;
    },
  } as unknown as FtHttpClient;

  return { calls, source: new LaBonneBoiteSource(franceTravail) };
}

const NANTES = {
  department: "44",
  inseeCode: "44109",
  label: "Nantes",
  latitude: 47.2184,
  longitude: -1.5536,
  radiusKm: 30,
};

describe("hiring places", () => {
  it("prefers the commune and its radius, then the coordinates, then the department", () => {
    expect(placeOf(NANTES)).toEqual({ citycode: "44109", distanceKm: 30, kind: "city" });
    expect(placeOf({ ...NANTES, inseeCode: "" })).toMatchObject({ kind: "geo" });
    expect(
      placeOf({ ...NANTES, inseeCode: "", latitude: null, longitude: null }),
    ).toEqual({ department: "44", kind: "department" });
    expect(
      placeOf({ ...NANTES, department: "", inseeCode: "", latitude: null, longitude: null }),
    ).toBeNull();
  });

  it("keeps the radius within what the API accepts", () => {
    expect(placeOf({ ...NANTES, radiusKm: 500 })).toMatchObject({ distanceKm: 200 });
    expect(placeOf({ ...NANTES, radiusKm: 0 })).toMatchObject({ distanceKm: 1 });
  });

  it("asks a department by its number, and names each place stably", () => {
    expect(placeQuery({ department: "44", kind: "department" })).toEqual({
      department_number: "44",
    });
    expect(placeKey({ citycode: "2A004", distanceKm: 10, kind: "city" })).toBe(
      "city:2A004:10",
    );
  });
});

describe("LaBonneBoiteSource.search", () => {
  it("asks for the best hundred of a job around a commune", async () => {
    const harness = source({ data: ANSWER, kind: "ok", status: 200 });

    await harness.source.search("M1805", { citycode: "44109", distanceKm: 30, kind: "city" });

    expect(harness.calls[0]).toEqual({
      path: "/recherche",
      query: { citycode: "44109", distance: "30", page_size: "100", rome: "M1805" },
    });
  });

  it("keeps the companies with a SIRET, and reads an unknown headcount as unknown", async () => {
    const harness = source({ data: ANSWER, kind: "ok", status: 200 });

    const reading = await harness.source.search("M1805", { department: "44", kind: "department" });

    expect(reading?.hits).toBe(47);
    expect(reading?.romeLabel).toBe("Développeur / Développeuse informatique");
    expect(reading?.companies.map((company) => company.siret)).toEqual([
      "38198356800092",
      "70204275500844",
    ]);
    expect(reading?.companies[0]).toMatchObject({
      headcountMax: 199,
      headcountMin: 100,
      name: "EVERIENCE",
      reachableByEmail: true,
    });
    expect(reading?.companies[1]).toMatchObject({
      headcountMax: null,
      headcountMin: null,
      highPotential: true,
      name: "CGI Nantes",
      reachableByEmail: false,
    });
  });

  it("gives nothing to keep when it could not ask", async () => {
    const harness = source({
      detail: "socket hang up",
      kind: "unavailable",
      reason: "network",
      status: null,
    });

    expect(
      await harness.source.search("M1805", { department: "44", kind: "department" }),
    ).toBeNull();
  });
});
