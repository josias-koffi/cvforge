import { Logger } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MappedReferential } from "./rome-referential";
import type { RomeReferentialClient } from "./rome-referential.client";
import { RomeSyncService } from "./rome-sync.service";
import type {
  RomeCodeHolder,
  RomeCounts,
  RomeEntity,
  RomeReferential,
  RomeStore,
  RomeSubstitution,
  RomeSyncRun,
} from "./rome.types";

const NOW = Date.parse("2026-09-23T10:00:00Z");
const DAY = 24 * 3_600_000;
const EMPTY: RomeCounts = {
  appellations: 0,
  competences: 0,
  links: 0,
  metiers: 0,
};

function download(metierCodes: string[]): MappedReferential {
  const referential: RomeReferential = {
    appellations: metierCodes.map((code) => ({
      code: `A-${code}`,
      libelle: code,
      libelleCourt: code,
      libelleSearch: code,
      metierCode: code,
    })),
    competences: [{ code: "C1", libelle: "Soudage", type: "SAVOIR" }],
    links: metierCodes.map((code) => ({
      competenceCode: "C1",
      metierCode: code,
    })),
    metiers: metierCodes.map((code) => ({
      code,
      domaineCode: "M18",
      domaineLibelle: "",
      grandDomaineCode: "M",
      grandDomaineLibelle: "",
      libelle: code,
    })),
    versions: { competences: "61", fichesMetiers: "61", metiers: "61" },
  };

  return { dropped: EMPTY, referential };
}

function run(status: RomeSyncRun["status"], startedAt: number): RomeSyncRun {
  return {
    finishedAt: null,
    id: `run-${status}`,
    startedAt: new Date(startedAt),
    stats: null,
    status,
  };
}

class FakeStore implements RomeStore {
  counts_: RomeCounts = EMPTY;
  codes_: Record<RomeEntity, string[]> = {
    appellation: [],
    competence: [],
    metier: [],
  };
  locked = false;
  runs: RomeSyncRun[] = [];
  finished: Array<{
    id: string;
    status: string;
    stats: Record<string, unknown>;
  }> = [];
  replaced: RomeReferential[] = [];
  pending: RomeSubstitution[] = [];
  applied: Array<{
    substitution: RomeSubstitution;
    holders: readonly RomeCodeHolder[];
  }> = [];
  recoverStale = vi.fn(async () => 0);

  async claimRun() {
    return this.locked ? null : run("running", NOW);
  }
  async finishRun(
    id: string,
    outcome: { status: "done" | "failed"; stats: Record<string, unknown> },
  ) {
    this.finished.push({ id, ...outcome });
  }
  async lastRun(status?: "done") {
    return (
      this.runs.find((entry) => !status || entry.status === status) ?? null
    );
  }
  async counts() {
    return this.counts_;
  }
  async codes(entity: RomeEntity) {
    return new Set(this.codes_[entity]);
  }
  async replace(referential: RomeReferential) {
    this.replaced.push(referential);
  }
  async recordSubstitutions() {
    return 0;
  }
  async pendingSubstitutions() {
    return this.pending;
  }
  async applySubstitution(
    substitution: RomeSubstitution,
    holders: readonly RomeCodeHolder[],
  ) {
    this.applied.push({ holders, substitution });
    return { search_project_rome: { duplicatesRemoved: 0, rewritten: 1 } };
  }
}

function fakeClient(
  options: { available?: boolean; result?: MappedReferential | Error } = {},
) {
  return {
    fetch: vi.fn(async () => {
      const result = options.result ?? download(["M1", "M2"]);
      if (result instanceof Error) throw result;
      return result;
    }),
    isAvailable: () => options.available ?? true,
  } as unknown as RomeReferentialClient & { fetch: ReturnType<typeof vi.fn> };
}

const HOLDERS: RomeCodeHolder[] = [
  {
    column: "appellation_code",
    entity: "appellation",
    scope: [],
    table: "search_project_rome",
  },
];

let store: FakeStore;

beforeEach(() => {
  store = new FakeStore();
  vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
  vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
});

afterEach(() => vi.restoreAllMocks());

describe("RomeSyncService.run", () => {
  it("replaces the referential and records what it did, source included", async () => {
    store.codes_ = {
      appellation: ["A-M1", "A-OLD"],
      competence: ["C1"],
      metier: ["M1", "OLD"],
    };
    const service = new RomeSyncService(
      store,
      fakeClient(),
      HOLDERS,
      () => NOW,
    );

    const outcome = await service.run();

    expect(outcome.status).toBe("done");
    expect(store.replaced).toHaveLength(1);
    expect(store.recoverStale).toHaveBeenCalled();
    expect(store.finished[0]).toMatchObject({
      stats: {
        counts: { appellations: 2, competences: 1, links: 2, metiers: 2 },
        retired: {
          appellation: { count: 1, sample: ["A-OLD"] },
          metier: { count: 1, sample: ["OLD"] },
        },
        source: "Source : ROME 4.0, France Travail (version 61)",
      },
      status: "done",
    });
  });

  it("applies pending substitutions to every holder after the replacement", async () => {
    store.pending = [
      { entity: "appellation", id: "s1", newCode: "NEW", oldCode: "OLD" },
    ];
    const service = new RomeSyncService(
      store,
      fakeClient(),
      HOLDERS,
      () => NOW,
    );

    const outcome = await service.run();

    expect(store.applied).toEqual([
      { holders: HOLDERS, substitution: store.pending[0] },
    ]);
    expect(outcome).toMatchObject({
      stats: {
        substitutions: [
          {
            entity: "appellation",
            newCode: "NEW",
            oldCode: "OLD",
            tables: {
              search_project_rome: { duplicatesRemoved: 0, rewritten: 1 },
            },
          },
        ],
      },
    });
  });

  it("does not claim anything when the ROME APIs are not enabled", async () => {
    const client = fakeClient({ available: false });
    const service = new RomeSyncService(store, client, HOLDERS, () => NOW);

    expect(await service.run()).toEqual({
      reason: "unavailable",
      status: "skipped",
    });
    expect(client.fetch).not.toHaveBeenCalled();
    expect(store.finished).toEqual([]);
  });

  it("stands aside when another instance holds the lock", async () => {
    store.locked = true;
    const client = fakeClient();

    expect(
      await new RomeSyncService(store, client, HOLDERS, () => NOW).run(),
    ).toEqual({
      reason: "locked",
      status: "skipped",
    });
    expect(client.fetch).not.toHaveBeenCalled();
  });

  it("keeps the previous referential when the download fails", async () => {
    const service = new RomeSyncService(
      store,
      fakeClient({ result: new Error("rome-metiers: throttled (503)") }),
      HOLDERS,
      () => NOW,
    );

    expect(await service.run()).toEqual({
      error: "rome-metiers: throttled (503)",
      status: "failed",
    });
    expect(store.replaced).toEqual([]);
    expect(store.finished[0]).toMatchObject({ status: "failed" });
  });

  it("refuses a download that lost more than a tenth of the referential", async () => {
    store.counts_ = {
      appellations: 10,
      competences: 1,
      links: 10,
      metiers: 10,
    };
    const service = new RomeSyncService(
      store,
      fakeClient(),
      HOLDERS,
      () => NOW,
    );

    const outcome = await service.run();

    expect(outcome).toMatchObject({ status: "failed" });
    expect(outcome.status === "failed" && outcome.error).toContain(
      "download refused",
    );
    expect(store.replaced).toEqual([]);
  });

  it("reports a non-Error failure too", async () => {
    const client = fakeClient();
    client.fetch.mockRejectedValueOnce("boom");

    expect(
      await new RomeSyncService(store, client, HOLDERS, () => NOW).run(),
    ).toEqual({
      error: "boom",
      status: "failed",
    });
  });
});

describe("RomeSyncService.runIfDue", () => {
  it("runs when nothing was ever synced", async () => {
    expect(
      (
        await new RomeSyncService(
          store,
          fakeClient(),
          HOLDERS,
          () => NOW,
        ).runIfDue()
      ).status,
    ).toBe("done");
  });

  it("waits a week after a successful sync", async () => {
    store.runs = [run("done", NOW - 6 * DAY)];
    const service = new RomeSyncService(
      store,
      fakeClient(),
      HOLDERS,
      () => NOW,
    );

    expect(await service.runIfDue()).toEqual({
      reason: "not-due",
      status: "skipped",
    });

    store.runs = [run("done", NOW - 8 * DAY)];
    expect((await service.runIfDue()).status).toBe("done");
  });

  it("waits a few hours after a failure instead of retrying every hour", async () => {
    store.runs = [run("failed", NOW - 2 * 3_600_000)];
    const service = new RomeSyncService(
      store,
      fakeClient(),
      HOLDERS,
      () => NOW,
    );

    expect(await service.runIfDue()).toEqual({
      reason: "not-due",
      status: "skipped",
    });

    store.runs = [run("failed", NOW - 7 * 3_600_000)];
    expect((await service.runIfDue()).status).toBe("done");
  });

  it("is never due while the ROME APIs are not enabled", async () => {
    const service = new RomeSyncService(
      store,
      fakeClient({ available: false }),
      HOLDERS,
      () => NOW,
    );

    expect(await service.runIfDue()).toEqual({
      reason: "not-due",
      status: "skipped",
    });
  });
});

describe("RomeSyncService scheduling", () => {
  it("checks every hour, and stops with the module", async () => {
    vi.useFakeTimers();
    try {
      const service = new RomeSyncService(
        store,
        fakeClient(),
        HOLDERS,
        () => NOW,
      );
      const due = vi
        .spyOn(service, "runIfDue")
        .mockResolvedValue({ reason: "not-due", status: "skipped" });

      service.onModuleInit();
      await vi.advanceTimersByTimeAsync(3_600_000);
      expect(due).toHaveBeenCalledTimes(1);

      service.onModuleDestroy();
      await vi.advanceTimersByTimeAsync(3_600_000);
      expect(due).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("logs a failed check instead of crashing the process", async () => {
    vi.useFakeTimers();
    const error = vi
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    try {
      const service = new RomeSyncService(
        store,
        fakeClient(),
        HOLDERS,
        () => NOW,
      );
      vi.spyOn(service, "runIfDue").mockRejectedValue(new Error("db down"));

      service.onModuleInit();
      await vi.advanceTimersByTimeAsync(3_600_000);
      service.onModuleDestroy();

      expect(error).toHaveBeenCalledWith(expect.stringContaining("db down"));
    } finally {
      vi.useRealTimers();
    }
  });
});
