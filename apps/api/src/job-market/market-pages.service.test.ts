import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgMarketStatsStore } from "../market/market-stats.pg-store";
import type { MarketReading } from "../market/market-stats.readings";
import { PgRomeAppellationsReader } from "../rome/rome-appellations.pg-reader";
import { PgRomeStore } from "../rome/rome.pg-store";
import { leadAppellation, MarketPagesService } from "./market-pages.service";

let testDatabase: TestDatabase;
let service: MarketPagesService;
let store: PgMarketStatsStore;

const MARCH = new Date("2026-03-01T00:00:00.000Z");
const QUARTER = "1er trimestre 2026";

function reading(
  romeCode: string,
  department: string,
  offersYear: number | null,
  overrides: Partial<MarketReading> = {},
): MarketReading {
  return {
    department,
    jobseekers: { period: QUARTER, value: 150 },
    offers: { period: QUARTER, value: 80 },
    offersYear: offersYear === null ? null : { period: QUARTER, value: offersYear },
    region: "52",
    romeCode,
    romeLabel: romeCode === "M1203" ? "Comptable" : "Boulanger / Boulangère",
    salary: null,
    tension: { period: "ANNEE 2025", value: 4 },
    ...overrides,
  };
}

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  store = new PgMarketStatsStore(testDatabase.db);
  service = new MarketPagesService(
    store,
    new PgRomeAppellationsReader(testDatabase.db),
  );
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.reset();
  await new PgRomeStore(testDatabase.db).replace({
    appellations: [
      { code: "12807", libelle: "Comptable unique", metierCode: "M1203" },
      { code: "12786", libelle: "Comptable", metierCode: "M1203" },
      { code: "11573", libelle: "Boulanger / Boulangère", metierCode: "D1102" },
    ].map((appellation) => ({
      ...appellation,
      libelleCourt: "",
      libelleSearch: appellation.libelle.toLowerCase(),
    })),
    competences: [],
    links: [],
    metiers: [
      ["M1203", "Comptable"],
      ["D1102", "Boulanger / Boulangère"],
    ].map(([code, libelle]) => ({
      code: code!,
      domaineCode: "",
      domaineLibelle: "",
      grandDomaineCode: "",
      grandDomaineLibelle: "",
      libelle: libelle!,
    })),
    versions: { competences: null, fichesMetiers: null, metiers: null },
  });

  for (const row of [
    reading("M1203", "44", 6770),
    reading("M1203", "49", 2400, { jobseekers: null }),
    reading("M1203", "85", 900),
    // No yearly count: no page, and no link to it.
    reading("M1203", "53", null),
    reading("D1102", "44", 1200),
    // No tension: no page either.
    reading("D1102", "85", 300, { tension: null }),
  ]) {
    await store.save(row, null, MARCH);
  }
});

describe("MarketPagesService.list", () => {
  it("lists only the pairs with a tension and a yearly count, most offers first", async () => {
    expect(
      (await service.list()).map((page) => `${page.romeCode}|${page.department}`),
    ).toEqual(["M1203|44", "M1203|49", "D1102|44", "M1203|85"]);
    expect((await service.list())[0]).toEqual({
      department: "44",
      departmentLabel: "Loire-Atlantique",
      refreshedAt: MARCH.toISOString(),
      romeCode: "M1203",
      romeLabel: "Comptable",
    });
  });
});

describe("MarketPagesService.page", () => {
  it("serves the figures, the job's appellations and the links around it", async () => {
    const page = await service.page("m1203", "44");

    expect(page).toMatchObject({
      department: "44",
      departmentLabel: "Loire-Atlantique",
      leadAppellationCode: "12786",
      romeCode: "M1203",
      romeLabel: "Comptable",
      salaryMinSample: 5,
      stats: { offersYear: { period: QUARTER, value: 6770 }, tension: { value: 4 } },
    });
    expect(page.appellations.map((a) => a.libelle)).toEqual([
      "Comptable",
      "Comptable unique",
    ]);
    // Same job, same region, with a page of its own; 53 has none.
    expect(page.neighbours.map((link) => link.department)).toEqual(["49", "85"]);
    expect(page.otherJobs).toEqual([
      {
        department: "44",
        departmentLabel: "Loire-Atlantique",
        romeCode: "D1102",
        romeLabel: "Boulanger / Boulangère",
      },
    ]);
  });

  it.each([
    ["a pair under the floor", "M1203", "53"],
    ["a pair with no tension", "D1102", "85"],
    ["a pair never read", "M1203", "13"],
    ["a malformed job code", "1203", "44"],
    ["an unknown department", "M1203", "750"],
  ])("answers 404 for %s", async (_label, rome, department) => {
    await expect(service.page(rome, department)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("leadAppellation", () => {
  const options = [
    { code: "1", libelle: "Aide comptable", metierCode: "M1203", metierLibelle: "" },
    { code: "2", libelle: "Comptable", metierCode: "M1203", metierLibelle: "" },
  ];

  it("takes the appellation named like the job, accents and case aside", () => {
    expect(leadAppellation(options, "COMPTABLE")?.code).toBe("2");
  });

  it("falls back to the first, and to none", () => {
    expect(leadAppellation(options, "Expert-comptable")?.code).toBe("1");
    expect(leadAppellation([], "Comptable")).toBeNull();
  });
});
