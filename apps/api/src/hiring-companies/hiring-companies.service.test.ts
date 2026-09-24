import { emptySearchProject, type SearchProject } from "@cvforge/types";
import type { StoredApplication } from "../applications/applications.types";
import type { StoredCompany } from "../companies/company-record";
import { describe, expect, it } from "vitest";
import type {
  HiringCompaniesStore,
  StoredHiringCompany,
  StoredHiringQuery,
} from "./hiring-companies.pg-store";
import { HiringCompaniesService } from "./hiring-companies.service";
import type {
  LaBonneBoiteSource,
  LbbCompany,
  LbbReading,
} from "./la-bonne-boite.source";

const NOW = Date.parse("2026-09-24T10:00:00.000Z");
const DAY_MS = 86_400_000;
const ANA = "ana@example.com";

function project(inseeCodes: string[]): SearchProject {
  return {
    ...emptySearchProject("p1"),
    locations: inseeCodes.map((inseeCode) => ({
      department: inseeCode.slice(0, 2),
      inseeCode,
      label: inseeCode,
      latitude: null,
      longitude: null,
      radiusKm: 30,
    })),
  };
}

function company(siret: string, hiringPotential: number): LbbCompany {
  return {
    city: "Nantes",
    department: "44",
    headcountMax: 199,
    headcountMin: 100,
    highPotential: false,
    hiringPotential,
    latitude: null,
    longitude: null,
    name: `Entreprise ${siret}`,
    nafCode: "6202A",
    nafLabel: "Conseil en systèmes et logiciels informatiques",
    postcode: "44000",
    reachableByEmail: true,
    siret,
  };
}

function createHarness(options: {
  searches?: Array<{ project: SearchProject; romeCodes: string[] }>;
  readings?: Record<string, LbbReading | null>;
  queries?: StoredHiringQuery[];
  rows?: StoredHiringCompany[];
  unavailable?: boolean;
  applications?: StoredApplication[];
  records?: StoredCompany[];
}) {
  const applications = [...(options.applications ?? [])];
  const queries = new Map((options.queries ?? []).map((query) => [query.queryKey, query]));
  let rows = [...(options.rows ?? [])];
  const asked: string[] = [];
  const store: HiringCompaniesStore = {
    companies: async (keys) => rows.filter((row) => keys.includes(row.queryKey)),
    queries: async (keys) => keys.flatMap((key) => (queries.has(key) ? [queries.get(key)!] : [])),
    replace: async (query, reading, at) => {
      queries.set(query.queryKey, {
        queryKey: query.queryKey,
        refreshedAt: at,
        romeCode: query.romeCode,
        romeLabel: reading.romeLabel,
      });
      rows = [
        ...rows.filter((row) => row.queryKey !== query.queryKey),
        ...reading.companies.map((entry) => ({ ...entry, queryKey: query.queryKey })),
      ];
    },
  };
  const source = {
    isAvailable: () => !options.unavailable,
    search: async (romeCode: string, place: { citycode?: string }) => {
      const key = `${romeCode}|${place.citycode}`;
      asked.push(key);
      return key in (options.readings ?? {})
        ? options.readings![key]!
        : { companies: [], hits: 0, romeLabel: "" };
    },
  } as unknown as LaBonneBoiteSource;
  const searches = options.searches ?? [
    { project: project(["44109"]), romeCodes: ["M1805"] },
  ];

  return {
    applications,
    asked,
    queries,
    service: new HiringCompaniesService(
      store,
      source,
      {
        findByProfileId: async () => searches[0]?.project ?? null,
        findRomeCodes: async () => searches[0]?.romeCodes ?? [],
        listAll: async () => searches.map((search) => ({ ...search, userEmail: ANA })),
      },
      {
        createDraft: async (application) => {
          applications.push(application);
          return application;
        },
        listByUserEmail: async (userEmail) =>
          applications.filter((application) => application.userEmail === userEmail),
      },
      {
        bySiren: async (sirens) =>
          new Map(
            (options.records ?? [])
              .filter((record) => sirens.includes(record.siren))
              .map((record) => [record.siren, record]),
          ),
      },
      () => NOW,
    ),
  };
}

describe("HiringCompaniesService.refreshDue", () => {
  it("calls nothing while La Bonne Boîte is not enabled", async () => {
    const harness = createHarness({ unavailable: true });

    expect(await harness.service.refreshDue()).toEqual({
      reason: "unavailable",
      status: "skipped",
    });
    expect(harness.asked).toEqual([]);
  });

  it("reads each confirmed job at each place once, then waits a week", async () => {
    const harness = createHarness({
      searches: [
        { project: project(["44109", "85191"]), romeCodes: ["M1805", "M1855"] },
        // A second candidate around Nantes at the same radius shares the reading.
        { project: project(["44109"]), romeCodes: ["M1805"] },
      ],
    });

    expect(await harness.service.refreshDue()).toMatchObject({ due: 4, read: 4 });
    expect(harness.asked.sort()).toEqual([
      "M1805|44109",
      "M1805|85191",
      "M1855|44109",
      "M1855|85191",
    ]);
    expect(await harness.service.refreshDue()).toMatchObject({ due: 0, read: 0 });
  });

  it("reads again after a week, and keeps the old copy when the API fails", async () => {
    const key = "M1805|city:44109:30";
    const harness = createHarness({
      queries: [
        { queryKey: key, refreshedAt: new Date(NOW - 8 * DAY_MS), romeCode: "M1805", romeLabel: "" },
      ],
      readings: { "M1805|44109": null },
    });

    expect(await harness.service.refreshDue()).toMatchObject({ due: 1, failed: 1 });
    expect(harness.queries.get(key)?.refreshedAt).toEqual(new Date(NOW - 8 * DAY_MS));
  });
});

describe("HiringCompaniesService.view", () => {
  it("lists each establishment once, best hiring potential first, with its job", async () => {
    const harness = createHarness({
      readings: {
        "M1805|44109": { companies: [company("1", 5), company("2", 25)], hits: 2, romeLabel: "Développeur / Développeuse informatique" },
        "M1855|44109": { companies: [company("1", 9)], hits: 1, romeLabel: "Développeur / Développeuse web" },
      },
      searches: [{ project: project(["44109"]), romeCodes: ["M1805", "M1855"] }],
    });
    await harness.service.refreshDue();

    const view = await harness.service.view(ANA, "p1");

    expect(view.status).toBe("ready");
    expect(view.refreshedAt).toBe(new Date(NOW).toISOString());
    expect(view.companies.map((entry) => [entry.siret, entry.romeLabel])).toEqual([
      ["2", "Développeur / Développeuse informatique"],
      ["1", "Développeur / Développeuse web"],
    ]);
  });

  it("says what is missing before there is anything to show", async () => {
    expect(
      (await createHarness({ searches: [{ project: project(["44109"]), romeCodes: [] }] }).service.view(ANA, "p1")).status,
    ).toBe("no_rome");
    expect(
      (await createHarness({ searches: [{ project: project([]), romeCodes: ["M1805"] }] }).service.view(ANA, "p1")).status,
    ).toBe("no_location");
    expect((await createHarness({}).service.view(ANA, "p1")).status).toBe("pending");
    expect((await createHarness({ searches: [] }).service.view(ANA, "p1")).status).toBe("no_rome");
  });
});

describe("HiringCompaniesService.applySpontaneously (US-120)", () => {
  async function readyHarness() {
    const harness = createHarness({
      readings: {
        "M1805|44109": {
          companies: [company("38198356800092", 25)],
          hits: 1,
          romeLabel: "Développeur / Développeuse informatique",
        },
      },
    });
    await harness.service.refreshDue();
    return harness;
  }

  it("creates a draft with no offer, from what La Bonne Boîte says of the company", async () => {
    const harness = await readyHarness();

    const result = await harness.service.applySpontaneously(ANA, "p1", "38198356800092");

    expect(result.outcome).toBe("created");
    expect(harness.applications).toHaveLength(1);
    expect(harness.applications[0]).toMatchObject({
      extracted: {
        companyName: "Entreprise 38198356800092",
        location: "44000 Nantes",
        requirements: [],
        responsibilities: [],
        title: "Développeur / Développeuse informatique",
      },
      offerUrl: null,
      profileId: "p1",
      sourceLabel: "Candidature spontanée — Entreprise 38198356800092 (SIRET 38198356800092)",
      sourceType: "spontaneous",
      status: "draft",
      userEmail: ANA,
    });
    expect(harness.applications[0]?.rawOfferText).toContain("Aucune offre publiée");
  });

  it("opens the application already made rather than a second one", async () => {
    const harness = await readyHarness();

    const first = await harness.service.applySpontaneously(ANA, "p1", "38198356800092");
    const second = await harness.service.applySpontaneously(ANA, "p1", "38198356800092");

    expect(second).toEqual({
      applicationId: first.outcome === "not_found" ? "" : first.applicationId,
      outcome: "existing",
    });
    expect(harness.applications).toHaveLength(1);
  });

  it("refuses a company the candidate's search does not list", async () => {
    const harness = await readyHarness();

    expect(
      await harness.service.applySpontaneously(ANA, "p1", "00000000000000"),
    ).toEqual({ outcome: "not_found" });
    expect(harness.applications).toEqual([]);
  });
});

describe("HiringCompaniesService company pages (US-121)", () => {
  const EVERIENCE: StoredCompany = {
    category: "GE",
    closed: false,
    createdOn: "1991-04-02",
    egaproScore: 94,
    egaproYear: "2025",
    employerPageEdited: true,
    employerPageOffers: 8,
    employerPagePath: "helpline-913",
    employerPageReadAt: new Date(NOW),
    ess: false,
    financesYear: "2025",
    found: true,
    gesReport: true,
    headcountBand: "51",
    inclusive: false,
    legalName: "EVERIENCE",
    mission: false,
    nafCode: "62.03Z",
    netIncome: 20_941_726,
    openEstablishments: 6,
    refreshedAt: new Date(NOW),
    revenue: 211_086_627,
    siren: "381983568",
  };

  async function readyHarness(records: StoredCompany[]) {
    const harness = createHarness({
      readings: {
        "M1805|44109": {
          companies: [company("38198356800092", 25), company("11111111100011", 5)],
          hits: 2,
          romeLabel: "Développeur / Développeuse informatique",
        },
      },
      records,
    });
    await harness.service.refreshDue();
    return harness;
  }

  it("badges each card from its company's record, none before it is read", async () => {
    const view = await (await readyHarness([EVERIENCE])).service.view(ANA, "p1");

    expect(view.companies.map((entry) => entry.badges.map((badge) => badge.key))).toEqual([
      ["egapro", "ges"],
      [],
    ]);
  });

  it("opens a listed company with its record, and no other", async () => {
    const harness = await readyHarness([EVERIENCE]);

    const detail = await harness.service.detail(ANA, "p1", "38198356800092");

    expect(detail?.company.name).toBe("Entreprise 38198356800092");
    expect(detail?.profile).toMatchObject({
      category: "GE",
      employerPage: { offers: 8, url: "https://recrute.francetravail.fr/page-employeur/helpline-913" },
      finances: { netIncome: 20_941_726, revenue: 211_086_627, year: "2025" },
      headcountLabel: "2 000 à 4 999 salariés",
      siren: "381983568",
    });
    expect((await harness.service.detail(ANA, "p1", "11111111100011"))?.profile).toBeNull();
    expect(await harness.service.detail(ANA, "p1", "00000000000000")).toBeNull();
  });
});
