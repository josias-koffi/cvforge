import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { jobs } from "../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgMarketStatsStore } from "./market-stats.pg-store";
import type { MarketReading } from "./market-stats.readings";

let testDatabase: TestDatabase;
let store: PgMarketStatsStore;

const MARCH = new Date("2026-03-01T00:00:00.000Z");
const APRIL = new Date("2026-04-01T00:00:00.000Z");

function reading(overrides: Partial<MarketReading> = {}): MarketReading {
  return {
    department: "44",
    jobseekers: { period: "1er trimestre 2026", value: 150 },
    offers: { period: "1er trimestre 2026", value: 870 },
    offersYear: { period: "1er trimestre 2026", value: 2910 },
    region: "52",
    romeCode: "M1805",
    romeLabel: "Développeur / Développeuse informatique",
    salary: { medianYearly: 42_000, period: "offres vues depuis juin 2026", sample: 12 },
    tension: { period: "ANNEE 2025", value: 5 },
    ...overrides,
  };
}

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  store = new PgMarketStatsStore(testDatabase.db);
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.reset();
});

describe("PgMarketStatsStore", () => {
  it("stores a reading and gives it back, periods included", async () => {
    await store.save(reading(), null, MARCH);

    expect(await store.find("M1805", "44")).toEqual({
      ...reading(),
      changeNote: null,
      changedAt: null,
      refreshedAt: MARCH,
    });
    expect(await store.refreshedAt(["M1805"])).toEqual(
      new Map([["M1805|44", MARCH]]),
    );
  });

  it("keeps last month's note through a quiet refresh", async () => {
    await store.save(reading(), "Les offres montent.", MARCH);
    await store.save(reading({ jobseekers: null, salary: null }), null, APRIL);

    expect(await store.find("M1805", "44")).toMatchObject({
      changeNote: "Les offres montent.",
      changedAt: MARCH,
      jobseekers: null,
      refreshedAt: APRIL,
      salary: null,
    });
  });

  it("lists a job's departments by region", async () => {
    await store.save(reading(), null, MARCH);
    await store.save(reading({ department: "85" }), null, MARCH);
    await store.save(reading({ department: "75", region: "11" }), null, MARCH);
    await store.save(reading({ romeCode: "D1102" }), null, MARCH);

    const rows = await store.listByRegions(["M1805"], ["52"]);

    expect(rows.map((row) => row.department).sort()).toEqual(["44", "85"]);
    expect(await store.listByRegions([], ["52"])).toEqual([]);
  });

  it("reads the salary labels of the job's recent offers in the department", async () => {
    const offer = (id: string, overrides: Partial<typeof jobs.$inferInsert>) => ({
      companyKey: "acme",
      companyName: "ACME",
      department: "44",
      descriptionSimhash: "",
      firstSeenAt: APRIL,
      id,
      lastSeenAt: APRIL,
      primaryUrl: `https://example.com/${id}`,
      romeCode: "M1805",
      salaryLabel: "Annuel de 42000,00 Euros",
      title: "Développeur",
      titleKey: "developpeur",
      ...overrides,
    });

    await testDatabase.db.insert(jobs).values([
      offer("00000000-0000-0000-0000-000000000001", {}),
      offer("00000000-0000-0000-0000-000000000002", { closedAt: APRIL }),
      offer("00000000-0000-0000-0000-000000000003", { salaryLabel: "" }),
      offer("00000000-0000-0000-0000-000000000004", { department: "85" }),
      offer("00000000-0000-0000-0000-000000000005", { firstSeenAt: MARCH }),
      offer("00000000-0000-0000-0000-000000000006", { romeCode: "D1102" }),
    ]);

    expect(await store.salaryLabels("M1805", "44", APRIL)).toEqual([
      "Annuel de 42000,00 Euros",
      "Annuel de 42000,00 Euros",
    ]);
  });

  it("keeps one demand per pair, dated by its latest request", async () => {
    await store.recordDemand("M1805", "44", MARCH);
    await store.recordDemand("M1805", "44", APRIL);
    await store.recordDemand("D1102", "85", MARCH);

    expect(await store.listDemand(APRIL)).toEqual([
      { department: "44", romeCode: "M1805" },
    ]);
    expect(await store.listDemand(MARCH)).toHaveLength(2);
  });
});
