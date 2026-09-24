import { NotFoundException } from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PgCompaniesStore } from "../companies/companies.pg-store";
import type { CompanyRecord } from "../companies/company-record";
import { hiringCompanies, hiringCompanyQueries } from "../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgMarketStatsStore } from "../market/market-stats.pg-store";
import { isIndexableCompany, PgCompanyPagesStore } from "./company-pages.pg-store";
import { CompanyPagesService } from "./company-pages.service";

let testDatabase: TestDatabase;
let companies: PgCompaniesStore;
let service: CompanyPagesService;

const SEPTEMBER = new Date("2026-09-01T00:00:00.000Z");
const QUARTER = "1er trimestre 2026";

/** Trimmed from EVERIENCE's record of 2026-09-24. */
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
  publishable: true,
  revenue: 211_086_627,
};

/** A record with nothing beyond a name and an activity. */
const BARE: CompanyRecord = {
  ...RECORD,
  egaproScore: null,
  egaproYear: null,
  financesYear: null,
  gesReport: false,
  headcountBand: "NN",
  legalName: "BARE",
  netIncome: null,
  revenue: null,
};

async function save(siren: string, record: Partial<CompanyRecord> = {}) {
  await companies.save(siren, { ...RECORD, ...record }, SEPTEMBER, null, null);
}

async function hires(siret: string, romeCode: string, department: string, city: string) {
  const queryKey = `${romeCode}|city:${department}:30`;
  await testDatabase.db
    .insert(hiringCompanyQueries)
    .values({ place: `city:${department}`, queryKey, romeCode, romeLabel: "Développeur / Développeuse web" })
    .onConflictDoNothing();
  await testDatabase.db.insert(hiringCompanies).values({
    city,
    department,
    name: "EVERIENCE NANTES",
    queryKey,
    siret,
  });
}

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  companies = new PgCompaniesStore(testDatabase.db);
  service = new CompanyPagesService(companies, new PgCompanyPagesStore(testDatabase.db));
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.reset();
});

describe("CompanyPagesService.list", () => {
  it("lists only the companies worth a page, the largest first", async () => {
    await save("381983568");
    await save("222222222", { headcountBand: "11", legalName: "PME" });
    await save("333333333", { ...BARE, legalName: "NN MAIS ESS", ess: true });
    await save("444444444", BARE);
    await save("555555555", { legalName: "NAJAT AGEZ", publishable: false });
    await save("666666666", { closed: true, legalName: "FERMEE" });
    await save("777777777", { legalName: "SANS NAF", nafCode: "" });
    await companies.save("888888888", null, SEPTEMBER, null, null);

    expect((await service.list()).map((entry) => entry.name)).toEqual([
      "EVERIENCE",
      "PME",
      "NN MAIS ESS",
    ]);
    expect((await service.list())[0]).toEqual({
      name: "EVERIENCE",
      refreshedAt: SEPTEMBER.toISOString(),
      siren: "381983568",
    });
  });

  it("agrees with the page on which company has one", async () => {
    await save("381983568");
    await save("444444444", BARE);
    await save("555555555", { publishable: false });
    await save("666666666", { closed: true });

    const listed = (await service.list()).map((entry) => entry.siren);
    const stored = await companies.findMany([
      "381983568",
      "444444444",
      "555555555",
      "666666666",
    ]);

    expect(stored.filter(isIndexableCompany).map((row) => row.siren)).toEqual(listed);
  });
});

describe("CompanyPagesService.page", () => {
  it("serves the stored record with its sources, and where it hires", async () => {
    await companies.save(
      "381983568",
      RECORD,
      SEPTEMBER,
      { edited: true, offers: 8, path: "everience-913" },
      null,
    );
    await save("222222222", { legalName: "VOISINE" });
    await save("333333333", { legalName: "AUTRE SECTEUR", nafCode: "47.11F" });
    await save("444444444", { ...BARE, legalName: "MINCE" });
    await hires("38198356800092", "M1855", "44", "Nantes");
    await hires("38198356800118", "M1855", "35", "Rennes");
    await new PgMarketStatsStore(testDatabase.db).save(
      {
        department: "44",
        jobseekers: null,
        offers: { period: QUARTER, value: 80 },
        offersYear: { period: QUARTER, value: 300 },
        region: "52",
        romeCode: "M1855",
        romeLabel: "Développement web",
        salary: null,
        tension: { period: "ANNEE 2025", value: 4 },
      },
      null,
      SEPTEMBER,
    );

    const page = await service.page(" 381983568 ");

    expect(page).toMatchObject({
      name: "EVERIENCE",
      refreshedAt: SEPTEMBER.toISOString(),
      siren: "381983568",
    });
    expect(page.company).toEqual({
      category: "GE",
      closed: false,
      createdOn: "1991-04-02",
      egapro: { score: 94, year: "2025" },
      employerPage: {
        edited: true,
        offers: 8,
        url: "https://recrute.francetravail.fr/page-employeur/everience-913",
      },
      ess: false,
      finances: { netIncome: 20_941_726, revenue: 211_086_627, year: "2025" },
      gesReport: true,
      headcountBand: "51",
      inclusive: false,
      legalName: "EVERIENCE",
      mission: false,
      nafCode: "62.03Z",
      nafSection: "J",
      openEstablishments: 6,
      siren: "381983568",
    });
    expect(page.hiring).toEqual([
      {
        city: "Rennes",
        department: "35",
        departmentLabel: "Ille-et-Vilaine",
        hasMarketPage: false,
        romeCode: "M1855",
        romeLabel: "Développeur / Développeuse web",
      },
      {
        city: "Nantes",
        department: "44",
        departmentLabel: "Loire-Atlantique",
        hasMarketPage: true,
        romeCode: "M1855",
        romeLabel: "Développeur / Développeuse web",
      },
    ]);
    // Neither itself, nor another sector, nor a company without a page.
    expect(page.sameSector).toEqual([{ name: "VOISINE", siren: "222222222" }]);
  });

  it("has no Egapro score nor employer page it does not know of", async () => {
    await save("333333333", { ...BARE, ess: true });

    const page = await service.page("333333333");

    expect(page.company.egapro).toBeNull();
    expect(page.company.employerPage).toBeNull();
    expect(page.company.finances).toBeNull();
    expect(page.hiring).toEqual([]);
  });

  it("is a 404 for any company without a page", async () => {
    await save("444444444", BARE);
    await save("555555555", { publishable: false });
    await save("666666666", { closed: true });
    await companies.save("888888888", null, SEPTEMBER, null, null);

    for (const siren of [
      "444444444",
      "555555555",
      "666666666",
      "888888888",
      "999999999",
      "12345",
      "38198356800092",
    ]) {
      await expect(service.page(siren), siren).rejects.toBeInstanceOf(
        NotFoundException,
      );
    }
  });
});
