import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { hiringCompanies } from "../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgCompaniesStore } from "./companies.pg-store";
import type { CompanyRecord } from "./company-record";

let testDatabase: TestDatabase;
let store: PgCompaniesStore;

const MARCH = new Date("2026-03-01T00:00:00.000Z");
const SEPTEMBER = new Date("2026-09-01T00:00:00.000Z");

const RECORD: CompanyRecord = {
  category: "GE",
  closed: false,
  createdOn: "1991-04-02",
  egaproDeclared: true,
  egaproScore: 94,
  egaproYear: "2025",
  ess: false,
  financesYear: "2025",
  gesReport: true,
  headcountBand: "51",
  inclusive: false,
  legalName: "EVERIENCE",
  mission: false,
  nafCode: "62.03Z",
  netIncome: 20_941_726,
  openEstablishments: 6,
  revenue: 211_086_627,
};

async function listEstablishments(...sirets: string[]) {
  await testDatabase.db.insert(hiringCompanies).values(
    sirets.map((siret, index) => ({
      name: `Entreprise ${index}`,
      queryKey: `M1805|city:44109:30|${index}`,
      siret,
    })),
  );
}

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  store = new PgCompaniesStore(testDatabase.db);
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.reset();
});

describe("PgCompaniesStore", () => {
  it("lists each establishment's SIREN once, until it is read", async () => {
    await listEstablishments("38198356800092", "38198356800118", "11111111100011");

    expect(await store.sirensDue(SEPTEMBER, 10)).toEqual(["111111111", "381983568"]);
    expect(await store.sirensDue(SEPTEMBER, 1)).toEqual(["111111111"]);

    await store.save("381983568", RECORD, MARCH);
    await store.save("111111111", null, SEPTEMBER);

    // March is before September's cutoff: due again.
    expect(await store.sirensDue(SEPTEMBER, 10)).toEqual(["381983568"]);
  });

  it("gives a record back, and forgets it when the SIREN is no longer known", async () => {
    await store.save("381983568", RECORD, MARCH);

    const [saved] = await store.findMany(["381983568"]);
    expect(saved).toMatchObject({
      egaproScore: 94,
      found: true,
      legalName: "EVERIENCE",
      refreshedAt: MARCH,
      revenue: 211_086_627,
    });

    await store.save("381983568", null, SEPTEMBER);
    expect((await store.findMany(["381983568"]))[0]).toMatchObject({
      egaproScore: null,
      found: false,
      legalName: "",
      refreshedAt: SEPTEMBER,
    });
    expect(await store.findMany([])).toEqual([]);
  });
});
