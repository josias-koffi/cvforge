import { describe, expect, it } from "vitest";
import { JobPurgeService } from "./job-purge.service";
import type { JobRetentionStore } from "./job-retention.pg-store";
import type { DigestRun, JobDigestRunsStore } from "./matches.types";

const NOW = Date.parse("2026-10-04T10:00:00.000Z");
const TODAY = "2026-10-04";

function run(overrides: Partial<DigestRun>): DigestRun {
  return {
    finishedAt: null,
    id: "r1",
    kind: "purge",
    runDate: TODAY,
    startedAt: new Date(NOW).toISOString(),
    stats: null,
    status: "done",
    ...overrides,
  };
}

function setup(
  options: {
    history?: DigestRun[];
    lockTaken?: boolean;
    failing?: boolean;
  } = {},
) {
  const history = options.history ?? [];
  const finished: Array<{ status: string; stats: Record<string, unknown> }> =
    [];
  const purgedBefore: string[] = [];
  const store: JobRetentionStore = {
    anonymizeClosed: async () => ({ jobs: 2, listings: 3 }),
    countExpired: async () => ({ expired: 5, keptForApplications: 1 }),
    countToAnonymize: async () => ({ jobs: 4, listings: 6 }),
    purgeExpired: async (before) => {
      if (options.failing) throw new Error("disk full");
      purgedBefore.push(before);
      return 5;
    },
  };
  const runs = {
    claim: async () => (options.lockTaken ? null : run({ status: "running" })),
    finish: async (_id: string, outcome: (typeof finished)[number]) => {
      finished.push(outcome);
    },
    latest: async (_kind: string, status?: DigestRun["status"]) =>
      history.find((entry) => !status || entry.status === status) ?? null,
    recoverStale: async () => 0,
  } as unknown as JobDigestRunsStore;

  return {
    finished,
    purgedBefore,
    service: new JobPurgeService(store, runs, () => NOW),
  };
}

describe("JobPurgeService (US-169)", () => {
  it("anonymizes, purges past 30 days and records the figures", async () => {
    const { finished, purgedBefore, service } = setup();

    const stats = await service.run();

    expect(stats).toEqual({
      errors: [],
      jobsAnonymized: 2,
      jobsKeptForApplications: 1,
      jobsPurged: 5,
      listingsAnonymized: 3,
    });
    expect(purgedBefore).toEqual(["2026-09-04T10:00:00.000Z"]);
    expect(finished).toEqual([{ stats: { ...stats }, status: "done" }]);
  });

  it("waits while a collection holds the lock", async () => {
    const { finished, service } = setup({ lockTaken: true });

    expect(await service.run()).toBeNull();
    expect(finished).toEqual([]);
  });

  it("records a failed purge for the admin", async () => {
    const { finished, service } = setup({ failing: true });

    const stats = await service.run();

    expect(stats?.errors).toEqual(["Error: disk full"]);
    expect(finished[0]?.status).toBe("failed");
  });

  it("never starts by itself before a first purge launched by hand", async () => {
    const { purgedBefore, service } = setup({
      history: [run({ runDate: "2026-10-01", status: "failed" })],
    });

    expect(await service.runIfDue()).toBeNull();
    expect(purgedBefore).toEqual([]);
  });

  it("runs once a day after that, and again the same day after a failure", async () => {
    const yesterday = setup({ history: [run({ runDate: "2026-10-03" })] });
    expect(await yesterday.service.runIfDue()).not.toBeNull();

    const doneToday = setup({ history: [run({})] });
    expect(await doneToday.service.runIfDue()).toBeNull();

    const failedToday = setup({
      history: [run({ status: "failed" }), run({ runDate: "2026-10-03" })],
    });
    expect(await failedToday.service.runIfDue()).not.toBeNull();
  });

  it("counts without writing anything for the dry run", async () => {
    const { finished, purgedBefore, service } = setup();

    expect(await service.preview()).toEqual({
      jobsKeptForApplications: 1,
      jobsToAnonymize: 4,
      jobsToPurge: 5,
      listingsToAnonymize: 6,
    });
    expect(purgedBefore).toEqual([]);
    expect(finished).toEqual([]);
  });
});
