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
      department: "44",
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
  it("lists each establishment's company once, with a name and a department, until it is read", async () => {
    await listEstablishments("38198356800092", "38198356800118", "11111111100011");
    const sirens = async (options?: { employerPages?: boolean }) =>
      (await store.due(SEPTEMBER, 10, options)).map((due) => due.siren);

    expect(await store.due(SEPTEMBER, 10)).toEqual([
      { department: "44", name: "Entreprise 2", siren: "111111111" },
      { department: "44", name: "Entreprise 0", siren: "381983568" },
    ]);
    expect(await store.due(SEPTEMBER, 1)).toHaveLength(1);

    await store.save("381983568", RECORD, MARCH, undefined, null);
    await store.save("111111111", null, SEPTEMBER, undefined, null);

    // March is before September's cutoff: due again.
    expect(await sirens()).toEqual(["381983568"]);

    await store.save("381983568", RECORD, SEPTEMBER, undefined, null);
    expect(await sirens()).toEqual([]);
    // Pages employeurs never asked: due once it is enabled.
    expect(await sirens({ employerPages: true })).toEqual(["111111111", "381983568"]);
  });

  it("is due for its logo until Wikidata was asked, and keeps it when Wikidata fails (ADR-025)", async () => {
    await listEstablishments("38198356800092");
    const logo =
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Logo.png/120px-Logo.png";

    // Read before logos existed: due again, whatever its date.
    await store.save("381983568", RECORD, SEPTEMBER);
    expect((await store.due(SEPTEMBER, 10)).map((due) => due.siren)).toEqual(["381983568"]);

    await store.save("381983568", RECORD, SEPTEMBER, undefined, logo);
    expect(await store.due(SEPTEMBER, 10)).toEqual([]);

    await store.save("381983568", RECORD, SEPTEMBER, undefined, undefined);
    expect((await store.findMany(["381983568"]))[0]).toMatchObject({
      logoReadAt: SEPTEMBER,
      logoUrl: logo,
    });
  });

  it("keeps the known employer page when the page could not be read", async () => {
    const page = { edited: true, offers: 8, path: "helpline-913" };
    await store.save("381983568", RECORD, MARCH, page);
    await store.save("381983568", RECORD, SEPTEMBER);

    expect((await store.findMany(["381983568"]))[0]).toMatchObject({
      employerPageEdited: true,
      employerPageOffers: 8,
      employerPagePath: "helpline-913",
      employerPageReadAt: MARCH,
      refreshedAt: SEPTEMBER,
    });

    await store.save("381983568", RECORD, SEPTEMBER, null);
    expect((await store.findMany(["381983568"]))[0]).toMatchObject({
      employerPagePath: null,
      employerPageReadAt: SEPTEMBER,
    });
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
