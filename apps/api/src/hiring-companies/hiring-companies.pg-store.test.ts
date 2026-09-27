import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgHiringCompaniesStore } from "./hiring-companies.pg-store";
import type { LbbCompany } from "./la-bonne-boite.source";

let testDatabase: TestDatabase;
let store: PgHiringCompaniesStore;

const MONDAY = new Date("2026-09-21T06:00:00.000Z");
const QUERY = { place: "city:44109:30", queryKey: "M1805|city:44109:30", romeCode: "M1805" };

function company(siret: string): LbbCompany {
  return {
    city: "Nantes",
    department: "44",
    headcountMax: null,
    headcountMin: null,
    highPotential: true,
    hiringPotential: 12.5,
    latitude: 47.2,
    longitude: -1.5,
    name: `Entreprise ${siret}`,
    nafCode: "6202A",
    nafLabel: "Conseil en systèmes et logiciels informatiques",
    postcode: "44000",
    reachableByEmail: false,
    siret,
  };
}

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  store = new PgHiringCompaniesStore(testDatabase.db);
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.reset();
});

describe("PgHiringCompaniesStore", () => {
  it("replaces a query's companies as a whole, and remembers when it read them", async () => {
    await store.replace(QUERY, { companies: [company("1"), company("2")], hits: 2, romeLabel: "Développeur" }, MONDAY);
    await store.replace(QUERY, { companies: [company("2"), company("2")], hits: 1, romeLabel: "Développeur" }, MONDAY);

    expect(await store.queries([QUERY.queryKey, "other"])).toEqual([
      { queryKey: QUERY.queryKey, refreshedAt: MONDAY, romeCode: "M1805", romeLabel: "Développeur" },
    ]);
    expect(await store.companies([QUERY.queryKey])).toEqual([
      { ...company("2"), queryKey: QUERY.queryKey },
    ]);
  });

  it("records a reading that found nobody, so it is not asked again at once", async () => {
    await store.replace(QUERY, { companies: [], hits: 0, romeLabel: "" }, MONDAY);

    expect(await store.queries([QUERY.queryKey])).toHaveLength(1);
    expect(await store.companies([QUERY.queryKey])).toEqual([]);
    expect(await store.companies([])).toEqual([]);
  });
});
