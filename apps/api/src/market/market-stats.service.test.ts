import { emptySearchProject, type SearchProject } from "@cvforge/types";
import { describe, expect, it } from "vitest";
import type { MarketApiReading, MarketStatsClient } from "./market-stats.client";
import {
  marketKey,
  type MarketStatsStore,
  type StoredMarketStats,
} from "./market-stats.pg-store";
import type { MarketReading } from "./market-stats.readings";
import { MarketStatsService, wantedTargets } from "./market-stats.service";

const NOW = Date.parse("2026-09-24T10:00:00.000Z");
const DAY_MS = 86_400_000;
const ANA = "ana@example.com";

function project(departments: string[]): SearchProject {
  return {
    ...emptySearchProject("p1"),
    locations: departments.map((department) => ({
      department,
      inseeCode: "",
      label: department,
      latitude: null,
      longitude: null,
      radiusKm: 30,
    })),
  };
}

function apiReading(
  romeCode: string,
  department: string,
  offersYear: number,
): MarketApiReading {
  return {
    department,
    jobseekers: null,
    offers: { period: "1er trimestre 2026", value: Math.round(offersYear / 4) },
    offersYear: { period: "1er trimestre 2026", value: offersYear },
    romeCode,
    romeLabel: "Développeur / Développeuse informatique",
    tension: { period: "ANNEE 2025", value: 5 },
  };
}

function createHarness(options: {
  searches?: Array<{ project: SearchProject; romeCodes: string[] }>;
  stored?: StoredMarketStats[];
  offersYear?: Record<string, number>;
  unavailable?: boolean;
  failing?: string[];
  salaryLabels?: string[];
  demand?: Array<{ romeCode: string; department: string }>;
}) {
  const rows = new Map(
    (options.stored ?? []).map((row) => [
      marketKey(row.romeCode, row.department),
      row,
    ]),
  );
  const reads: Array<{ key: string; jobseekers: boolean }> = [];
  const demand = new Map(
    (options.demand ?? []).map((pair) => [
      marketKey(pair.romeCode, pair.department),
      { ...pair, at: new Date(NOW) },
    ]),
  );
  const store: MarketStatsStore = {
    find: async (romeCode, department) =>
      rows.get(marketKey(romeCode, department)) ?? null,
    listByRegions: async (romeCodes, regions) =>
      [...rows.values()].filter(
        (row) => romeCodes.includes(row.romeCode) && regions.includes(row.region),
      ),
    refreshedAt: async () =>
      new Map([...rows].map(([key, row]) => [key, row.refreshedAt])),
    salaryLabels: async () => options.salaryLabels ?? [],
    listIndexable: async () => [],
    listIndexableInDepartment: async () => [],
    recordDemand: async (romeCode, department, at) => {
      demand.set(marketKey(romeCode, department), { at, department, romeCode });
    },
    listDemand: async (since) =>
      [...demand.values()]
        .filter((pair) => pair.at >= since)
        .map(({ romeCode, department }) => ({ department, romeCode })),
    save: async (reading: MarketReading, change, at) => {
      const key = marketKey(reading.romeCode, reading.department);
      const previous = rows.get(key);
      rows.set(key, {
        ...reading,
        changeNote: change ?? previous?.changeNote ?? null,
        changedAt: change ? at : (previous?.changedAt ?? null),
        refreshedAt: at,
      });
    },
  };
  const client = {
    isAvailable: () => !options.unavailable,
    read: async (
      romeCode: string,
      department: string,
      { jobseekers }: { jobseekers: boolean },
    ) => {
      const key = marketKey(romeCode, department);
      reads.push({ jobseekers, key });
      if (options.failing?.includes(key)) return null;

      return apiReading(romeCode, department, options.offersYear?.[key] ?? 100);
    },
  } as unknown as MarketStatsClient;
  const searches = options.searches ?? [
    { project: project(["44"]), romeCodes: ["M1805"] },
  ];

  return {
    demand,
    reads,
    rows,
    service: new MarketStatsService(
      store,
      client,
      {
        findByProfileId: async () => searches[0]?.project ?? null,
        findRomeCodes: async () => searches[0]?.romeCodes ?? [],
        listAll: async () =>
          searches.map((search) => ({ ...search, userEmail: ANA })),
      },
      () => NOW,
    ),
  };
}

function stored(
  department: string,
  overrides: Partial<StoredMarketStats> = {},
): StoredMarketStats {
  return {
    ...apiReading("M1805", department, 100),
    changeNote: null,
    changedAt: null,
    refreshedAt: new Date(NOW - DAY_MS),
    region: "52",
    salary: null,
    ...overrides,
  };
}

describe("wantedTargets", () => {
  it("reads each confirmed job in the search's departments, then the rest of their region", () => {
    const targets = wantedTargets([
      { project: project(["44", "49", "zz"]), romeCodes: ["M1805"] },
    ]);

    expect(targets.filter((target) => target.own).map((t) => t.department)).toEqual(["44", "49"]);
    expect(
      targets.filter((target) => !target.own).map((t) => t.department).sort(),
    ).toEqual(["53", "72", "85"]);
  });

  it("adds the pairs visitors asked for, without their region", () => {
    const targets = wantedTargets(
      [{ project: project(["44"]), romeCodes: ["M1805"] }],
      [
        { department: "44", romeCode: "M1805" },
        { department: "13", romeCode: "K2204" },
      ],
    );

    expect(targets.find((t) => t.department === "44")).toMatchObject({
      demanded: true,
      own: true,
    });
    expect(targets.filter((t) => t.romeCode === "K2204")).toEqual([
      { demanded: true, department: "13", own: false, romeCode: "K2204" },
    ]);
  });
});

describe("MarketStatsService.lookup", () => {
  it("answers from the copy, and queues nothing for a pair already read", async () => {
    const harness = createHarness({ stored: [stored("44")] });

    expect(await harness.service.lookup("M1805", "44")).toMatchObject({
      department: "44",
      romeCode: "M1805",
    });
    expect(harness.demand.size).toBe(0);
    expect(harness.reads).toEqual([]);
  });

  it("queues a pair never read, and never calls the API for it", async () => {
    const harness = createHarness({ searches: [] });

    expect(await harness.service.lookup("K2204", "13")).toBeNull();
    expect(harness.reads).toEqual([]);
    expect([...harness.demand.keys()]).toEqual(["K2204|13"]);
  });

  it("reads a queued pair at the next refresh, job seekers included", async () => {
    const harness = createHarness({ searches: [] });

    await harness.service.lookup("K2204", "13");
    await harness.service.refreshDue();

    expect(harness.reads).toEqual([{ jobseekers: true, key: "K2204|13" }]);
    expect(harness.rows.get("K2204|13")).toMatchObject({ region: "93" });
  });

  it("forgets a demand after ninety days", async () => {
    const harness = createHarness({ searches: [] });
    harness.demand.set("K2204|13", {
      at: new Date(NOW - 91 * DAY_MS),
      department: "13",
      romeCode: "K2204",
    });

    await harness.service.refreshDue();

    expect(harness.reads).toEqual([]);
  });
});

describe("MarketStatsService.refreshDue", () => {
  it("calls nothing when the API is not enabled", async () => {
    const harness = createHarness({ unavailable: true });

    expect(await harness.service.refreshDue()).toEqual({
      reason: "unavailable",
      status: "skipped",
    });
    expect(harness.reads).toEqual([]);
  });

  it("reads the missing figures, own department first, job seekers there only", async () => {
    const harness = createHarness({
      salaryLabels: Array(5).fill("Annuel de 42000,00 Euros"),
    });

    const outcome = await harness.service.refreshDue();

    expect(outcome).toEqual({ due: 5, failed: 0, read: 5, status: "done" });
    expect(harness.reads[0]).toEqual({ jobseekers: true, key: "M1805|44" });
    expect(harness.reads.slice(1).every((read) => !read.jobseekers)).toBe(true);
    expect(harness.rows.get("M1805|44")).toMatchObject({
      region: "52",
      salary: {
        medianYearly: 42_000,
        period: "offres vues depuis juin 2026",
        sample: 5,
      },
    });
  });

  it("leaves a month-fresh figure alone, and keeps the old one when the API fails", async () => {
    const harness = createHarness({
      failing: ["M1805|49"],
      stored: [
        stored("44", { refreshedAt: new Date(NOW - 29 * DAY_MS) }),
        stored("49", { refreshedAt: new Date(NOW - 31 * DAY_MS) }),
      ],
    });

    const outcome = await harness.service.refreshDue();

    expect(harness.reads.map((read) => read.key)).not.toContain("M1805|44");
    expect(outcome).toMatchObject({ failed: 1 });
    expect(harness.rows.get("M1805|49")?.refreshedAt).toEqual(
      new Date(NOW - 31 * DAY_MS),
    );
  });

  it("notes a notable change in the candidate's own department only", async () => {
    const lastQuarter = { period: "4ème trimestre 2025", value: 1000 };
    const harness = createHarness({
      offersYear: { "M1805|44": 2000, "M1805|85": 2000 },
      stored: [
        stored("44", { offersYear: lastQuarter, refreshedAt: new Date(0) }),
        stored("85", { offersYear: lastQuarter, refreshedAt: new Date(0) }),
      ],
    });

    await harness.service.refreshDue();

    expect(harness.rows.get("M1805|44")?.changeNote).toContain(
      "en Loire-Atlantique : offres en hausse",
    );
    expect(harness.rows.get("M1805|85")?.changeNote).toBeNull();
    expect(
      await harness.service.notesFor({
        project: project(["44"]),
        romeCodes: ["M1805"],
        since: new Date(NOW - DAY_MS),
      }),
    ).toHaveLength(1);
    // Tomorrow morning, the same note is not repeated.
    expect(
      await harness.service.notesFor({
        project: project(["44"]),
        romeCodes: ["M1805"],
        since: new Date(NOW + 1),
      }),
    ).toEqual([]);
  });
});

describe("MarketStatsService.radar", () => {
  it("shows the search's department and the region's best one when it has more offers", async () => {
    const harness = createHarness({
      stored: [
        stored("44", { offersYear: { period: "1er trimestre 2026", value: 900 } }),
        stored("85", { offersYear: { period: "1er trimestre 2026", value: 1200 } }),
        stored("49", { offersYear: { period: "1er trimestre 2026", value: 300 } }),
      ],
    });

    const [entry, ...rest] = await harness.service.radar(ANA, "p1");

    expect(rest).toEqual([]);
    expect(entry).toMatchObject({
      bestNeighbour: { department: "85", departmentLabel: "Vendée" },
      local: { department: "44", departmentLabel: "Loire-Atlantique" },
      romeCode: "M1805",
      romeLabel: "Développeur / Développeuse informatique",
    });
  });

  it("names no neighbour when the candidate's department already leads", async () => {
    const harness = createHarness({
      stored: [
        stored("44", { offersYear: { period: "1er trimestre 2026", value: 900 } }),
        stored("85", { offersYear: { period: "1er trimestre 2026", value: 200 } }),
      ],
    });

    expect((await harness.service.radar(ANA, "p1"))[0]?.bestNeighbour).toBeNull();
  });

  it("shows nothing before the first reading, rather than calling the API", async () => {
    const harness = createHarness({});

    expect(await harness.service.radar(ANA, "p1")).toEqual([]);
    expect(harness.reads).toEqual([]);
  });
});
