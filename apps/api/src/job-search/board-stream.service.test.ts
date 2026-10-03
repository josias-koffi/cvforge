import { describe, expect, it, vi } from "vitest";
import type { BoardCadenceStore, FrequentBoard } from "./board-cadence.types";
import {
  BoardStreamService,
  cycleCapacity,
  FOLLOW_WINDOW_MS,
  MATCH_WINDOW_MS,
  REFUSAL_PAUSE_MS,
  resolveBoardStreamConfig,
} from "./board-stream.service";
import type { FrequentReadReport } from "./boards.service";
import type { JobSource, NormalizedJobListing } from "./job-search.types";
import { MemoryCursors } from "./job-stream.testing";
import type { BoardProvider } from "./sources/boards/detect-board";

const NOW = Date.parse("2026-10-01T10:00:00Z");
const CONFIG = { intervalMs: 30 * 60_000 };

function board(
  provider: FrequentBoard["provider"],
  boardToken: string,
  minutesAgo: number,
): FrequentBoard {
  return { boardToken, interestAt: new Date(NOW - minutesAgo * 60_000), provider };
}

function cadence(input: {
  interested?: FrequentBoard[];
  applications?: Array<{ url: string; createdAt: Date }>;
}) {
  const store: BoardCadenceStore = {
    filterReadable: vi.fn(async (boards) => [...boards]),
    knownIds: vi.fn(),
    listApplicationUrls: vi.fn(async () => input.applications ?? []),
    listInterested: vi.fn(async () => input.interested ?? []),
    pauseFrequent: vi.fn(async () => {}),
    recordSeen: vi.fn(),
  };

  return store;
}

function boards(report: Partial<FrequentReadReport> = {}) {
  return {
    readFrequent: vi.fn(async () => ({
      boardsFailed: 0,
      boardsRead: 0,
      newListings: [],
      refused: [],
      ...report,
    })),
    supportedProviders: (): BoardProvider[] => [
      "ashby",
      "greenhouse",
      "lever",
      "smartrecruiters",
    ],
  };
}

function createService(input: {
  store: BoardCadenceStore;
  boards?: ReturnType<typeof boards>;
  cursors?: MemoryCursors;
  disabled?: JobSource[];
  sink?: (listings: NormalizedJobListing[]) => Promise<void>;
}) {
  const reader = input.boards ?? boards();
  const sink = vi.fn(input.sink ?? (async () => {}));
  const cursors = input.cursors ?? new MemoryCursors();
  const service = new BoardStreamService(
    reader,
    input.store,
    cursors,
    { listDisabled: async () => new Set(input.disabled ?? []) },
    sink,
    CONFIG,
    () => NOW,
    "instance-1",
  );

  return { cursors, reader, service, sink };
}

describe("BoardStreamService.selectBoards", () => {
  it("asks for matches of the last 30 days and follows of the last 90", async () => {
    const store = cadence({});
    const { service } = createService({ store });

    await service.selectBoards(NOW);

    expect(store.listInterested).toHaveBeenCalledWith({
      followedSince: new Date(NOW - FOLLOW_WINDOW_MS),
      matchedSince: new Date(NOW - MATCH_WINDOW_MS),
      now: new Date(NOW),
    });
    expect(store.listApplicationUrls).toHaveBeenCalledWith(
      new Date(NOW - FOLLOW_WINDOW_MS),
    );
  });

  it("adds the companies of imported applications, once, with their latest interest", async () => {
    const store = cadence({
      applications: [
        { createdAt: new Date(NOW - 60_000), url: "https://jobs.lever.co/acme/123" },
        { createdAt: new Date(NOW - 3_600_000), url: "https://jobs.lever.co/acme/456" },
        { createdAt: new Date(NOW), url: "https://www.example.com/careers" },
      ],
      interested: [board("lever", "acme", 600)],
    });
    const { service } = createService({ store });

    const { selected } = await service.selectBoards(NOW);

    expect(selected).toEqual([board("lever", "acme", 1)]);
  });

  it("leaves out a provider with no adapter, or one an admin switched off", async () => {
    const store = cadence({
      interested: [
        board("workable", "w", 1),
        board("greenhouse", "g", 1),
        board("ashby", "a", 1),
      ],
    });
    const { service } = createService({ disabled: ["greenhouse"], store });

    const { selected } = await service.selectBoards(NOW);

    expect(selected.map((entry) => entry.boardToken)).toEqual(["a"]);
  });

  it("caps each provider to its cycle budget, most recent interest first", async () => {
    const capacity = cycleCapacity("lever");
    const interested = Array.from({ length: capacity + 3 }, (_, index) =>
      board("lever", `company-${index}`, index),
    );
    const store = cadence({ interested: [...interested].reverse() });
    const { service } = createService({ store });

    const { selected, overflow } = await service.selectBoards(NOW);

    expect(capacity).toBe(900);
    expect(selected).toHaveLength(900);
    expect(selected[0]?.boardToken).toBe("company-0");
    expect(selected.at(-1)?.boardToken).toBe("company-899");
    expect(overflow).toEqual({ lever: 3 });
  });
});

describe("BoardStreamService.tick", () => {
  it("hands only the new offers over, and keeps the report for the admin", async () => {
    const fresh = { externalId: "N1", partnerUrls: [] } as unknown as NormalizedJobListing;
    const reader = boards({ boardsRead: 1, newListings: [fresh] });
    const store = cadence({ interested: [board("greenhouse", "acme", 5)] });
    const { cursors, service, sink } = createService({ boards: reader, store });

    const result = await service.tick();

    expect(reader.readFrequent).toHaveBeenCalledWith([board("greenhouse", "acme", 5)]);
    expect(sink).toHaveBeenCalledWith([fresh]);
    expect(result).toMatchObject({ boardsRead: 1, newListings: 1, status: "done" });
    expect(cursors.reports.get("boards_frequent")).toMatchObject({
      newListings: 1,
      status: "done",
    });
    expect(cursors.holder).toBeNull();
  });

  it("sends a board that answered 429 or 403 back to the daily pass for 24 hours", async () => {
    const store = cadence({ interested: [board("greenhouse", "acme", 5)] });
    const reader = boards({
      boardsFailed: 1,
      refused: [{ boardToken: "acme", provider: "greenhouse", status: 429 }],
    });
    const { service } = createService({ boards: reader, store });

    const result = await service.tick();

    expect(store.pauseFrequent).toHaveBeenCalledWith(
      "greenhouse",
      "acme",
      new Date(NOW + REFUSAL_PAUSE_MS),
    );
    expect(result).toMatchObject({ paused: ["greenhouse/acme (429)"] });
  });

  it("lets a single instance run the pass", async () => {
    const cursors = new MemoryCursors();
    cursors.holder = "instance-2";
    const reader = boards();
    const { service } = createService({ boards: reader, cursors, store: cadence({}) });

    expect(await service.tick()).toEqual({ status: "locked" });
    expect(reader.readFrequent).not.toHaveBeenCalled();
  });
});

describe("resolveBoardStreamConfig", () => {
  it("runs every 30 minutes by default, and refuses a pace under five", () => {
    expect(resolveBoardStreamConfig({})).toEqual({ intervalMs: 30 * 60_000 });
    expect(
      resolveBoardStreamConfig({ JOB_BOARDS_INTERVAL_MINUTES: "2" }),
    ).toEqual({ intervalMs: 30 * 60_000 });
  });
});
