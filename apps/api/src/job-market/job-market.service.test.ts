import type { RomeAppellationOption } from "@cvforge/types";
import { describe, expect, it, vi } from "vitest";
import type { MarketStatsClient } from "../market/market-stats.client";
import type {
  MarketStatsStore,
  StoredMarketStats,
} from "../market/market-stats.pg-store";
import { MarketStatsService } from "../market/market-stats.service";
import { JobMarketService } from "./job-market.service";

const DEV: RomeAppellationOption = {
  code: "38874",
  libelle: "Développeur / Développeuse web",
  metierCode: "M1855",
  metierLibelle: "Développement web",
};
const MARCH = new Date("2026-03-01T00:00:00.000Z");

function stored(overrides: Partial<StoredMarketStats> = {}): StoredMarketStats {
  return {
    changeNote: "Une note du radar",
    changedAt: MARCH,
    department: "44",
    jobseekers: { period: "1er trimestre 2026", value: 330 },
    offers: { period: "1er trimestre 2026", value: 270 },
    offersYear: { period: "1er trimestre 2026", value: 1100 },
    refreshedAt: MARCH,
    region: "52",
    romeCode: "M1855",
    romeLabel: "Développeur / Développeuse web",
    salary: { medianYearly: 38_000, period: "offres vues depuis juin 2026", sample: 9 },
    tension: { period: "ANNEE 2025", value: 5 },
    ...overrides,
  };
}

/**
 * The real radar service behind the tool, over an in-memory store and an API
 * client that fails the test if anything calls it.
 */
function createHarness(rows: StoredMarketStats[] = []) {
  const recordDemand = vi.fn().mockResolvedValue(undefined);
  const store = {
    find: async (romeCode: string, department: string) =>
      rows.find(
        (row) => row.romeCode === romeCode && row.department === department,
      ) ?? null,
    recordDemand,
  } as unknown as MarketStatsStore;
  const read = vi.fn();
  const client = { isAvailable: () => true, read } as unknown as MarketStatsClient;
  const market = new MarketStatsService(
    store,
    client,
    {} as never,
    () => MARCH.getTime(),
  );
  const find = vi.fn(async (code: string) => (code === DEV.code ? DEV : null));
  const search = vi.fn().mockResolvedValue([DEV]);

  return {
    find,
    read,
    recordDemand,
    search,
    service: new JobMarketService({ find, search }, market),
  };
}

describe("JobMarketService.read", () => {
  it("answers the job's figures in the department from the copy", async () => {
    const harness = createHarness([stored()]);

    expect(
      await harness.service.read({ appellation: "38874", department: "44" }),
    ).toEqual({
      appellation: DEV,
      department: "44",
      departmentLabel: "Loire-Atlantique",
      refreshedAt: MARCH.toISOString(),
      salaryMinSample: 5,
      stats: {
        jobseekers: { period: "1er trimestre 2026", value: 330 },
        offers: { period: "1er trimestre 2026", value: 270 },
        offersYear: { period: "1er trimestre 2026", value: 1100 },
        salary: {
          medianYearly: 38_000,
          period: "offres vues depuis juin 2026",
          sample: 9,
        },
        tension: { period: "ANNEE 2025", value: 5 },
      },
      status: "ready",
    });
    expect(harness.read).not.toHaveBeenCalled();
    expect(harness.recordDemand).not.toHaveBeenCalled();
  });

  /** The radar stores no median below the sample: the page says why. */
  it("carries no salary when too few offers stated one", async () => {
    const harness = createHarness([stored({ salary: null })]);

    const response = await harness.service.read({
      appellation: "38874",
      department: "44",
    });

    expect(response.stats?.salary).toBeNull();
    expect(response.salaryMinSample).toBe(5);
  });

  it("queues a pair never read, without calling France Travail", async () => {
    const harness = createHarness();

    expect(
      await harness.service.read({ appellation: "38874", department: "2a" }),
    ).toMatchObject({
      department: "2A",
      departmentLabel: "Corse-du-Sud",
      refreshedAt: null,
      stats: null,
      status: "collecting",
    });
    expect(harness.recordDemand).toHaveBeenCalledWith("M1855", "2A", MARCH);
    expect(harness.read).not.toHaveBeenCalled();
  });

  it.each([
    [{ appellation: "38874", department: "750" }, "DEPARTMENT_UNKNOWN"],
    [{ appellation: "38874", department: undefined }, "DEPARTMENT_UNKNOWN"],
    [{ appellation: "99999", department: "44" }, "ROME_APPELLATION_UNKNOWN"],
    [{ appellation: "M1855", department: "44" }, "ROME_APPELLATION_UNKNOWN"],
    [{ appellation: ["38874"], department: "44" }, "ROME_APPELLATION_UNKNOWN"],
  ])("refuses %j with %s and queues nothing", async (raw, code) => {
    const harness = createHarness();

    await expect(harness.service.read(raw)).rejects.toMatchObject({
      response: { code },
    });
    expect(harness.recordDemand).not.toHaveBeenCalled();
  });

  it("never asks the referential for a code that is not a number", async () => {
    const harness = createHarness();

    await expect(
      harness.service.read({ appellation: "%", department: "44" }),
    ).rejects.toThrow();
    expect(harness.find).not.toHaveBeenCalled();
  });
});

describe("JobMarketService.suggest", () => {
  it("reads the local referential, bounded", async () => {
    const harness = createHarness();

    expect(await harness.service.suggest("x".repeat(200))).toEqual([DEV]);
    expect(harness.search).toHaveBeenCalledWith("x".repeat(80), 8);
  });

  it("treats a missing or repeated query as empty", async () => {
    const harness = createHarness();

    await harness.service.suggest(["dev", "ops"]);

    expect(harness.search).toHaveBeenCalledWith("", 8);
  });
});
