import { describe, expect, it, vi } from "vitest";
import { BoardsService } from "./boards.service";
import type { JobBoardsStore, RegisteredBoard } from "./boards.types";
import { BoardHttpClient } from "./sources/boards/board-http";

function makeBoard(overrides: Partial<RegisteredBoard> = {}): RegisteredBoard {
  return {
    boardToken: "acme",
    companyName: "ACME",
    consecutiveFailures: 0,
    createdAt: "2026-09-01T00:00:00.000Z",
    enabled: true,
    lastFetchedAt: null,
    lastJobCount: 0,
    lastStatus: null,
    origin: "crawl",
    provider: "greenhouse",
    ...overrides,
  };
}

function createStore(boards: RegisteredBoard[] = []) {
  const registered: Array<{ provider: string; boardToken: string; origin: string }> = [];
  const fetches: Array<{ boardToken: string; failed: boolean; gone?: boolean }> = [];
  const store: JobBoardsStore = {
    find: async () => null,
    list: async () => boards,
    listEnabled: async () => boards,
    recordFetch: async (provider, boardToken, outcome) => {
      fetches.push({ boardToken, failed: outcome.failed, gone: outcome.gone });
      return makeBoard({ boardToken, provider });
    },
    register: async (board) => {
      registered.push(board);
      return makeBoard(board);
    },
    setEnabled: async () => null,
  };

  return { fetches, registered, store };
}

function createHttp(handler: (url: string) => Response) {
  let now = 0;
  const fetchImpl = vi.fn(async (url: unknown) => handler(String(url)));

  return new BoardHttpClient(
    fetchImpl as unknown as typeof globalThis.fetch,
    () => now,
    5_000,
    async (delayMs: number) => {
      now += delayMs;
    },
  );
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

describe("BoardsService.registerFromUrl", () => {
  it("registers the company behind a board URL", async () => {
    const { registered, store } = createStore();

    await new BoardsService(store).registerFromUrl(
      "https://job-boards.greenhouse.io/doctolib/jobs/7583949003",
      "user",
    );

    expect(registered).toEqual([
      { boardToken: "doctolib", companyName: undefined, origin: "user", provider: "greenhouse" },
    ]);
  });

  it("registers a provider that has no adapter yet", async () => {
    const { registered, store } = createStore();

    // Workable cannot be collected today; losing the company would mean
    // rediscovering it later for nothing.
    await new BoardsService(store).registerFromUrl(
      "https://apply.workable.com/gorgias/j/ABC123/",
      "france_travail",
    );

    expect(registered[0]).toMatchObject({ provider: "workable" });
  });

  it("ignores a URL that is not a job board", async () => {
    const { registered, store } = createStore();

    await new BoardsService(store).registerFromUrl(
      "https://www.linkedin.com/jobs/view/123",
      "user",
    );

    expect(registered).toEqual([]);
  });

  it("never lets a registry failure break the caller", async () => {
    const { store } = createStore();
    store.register = async () => {
      throw new Error("base indisponible");
    };

    await expect(
      new BoardsService(store).registerFromUrl(
        "https://jobs.lever.co/swile/8f2c",
        "user",
      ),
    ).resolves.toBeNull();
  });
});

describe("BoardsService.collect", () => {
  it("reads every enabled board and records the counts", async () => {
    const { fetches, store } = createStore([
      makeBoard({ boardToken: "doctolib", provider: "greenhouse" }),
      makeBoard({ boardToken: "swile", provider: "lever" }),
    ]);
    const http = createHttp((url) =>
      url.includes("greenhouse")
        ? jsonResponse({
            jobs: [
              {
                absolute_url: "https://job-boards.greenhouse.io/doctolib/jobs/1",
                content: "&lt;p&gt;Poste&lt;/p&gt;",
                first_published: "2026-09-01T08:00:00Z",
                id: 1,
                location: { name: "Paris, France" },
                title: "Développeur (CDI)",
              },
            ],
          })
        : jsonResponse([]),
    );

    const report = await new BoardsService(store, http).collect();

    expect(report).toMatchObject({ boardsFailed: 0, boardsRead: 2 });
    expect(report.listings).toHaveLength(1);
    expect(fetches).toEqual([
      { boardToken: "doctolib", failed: false, gone: undefined },
      { boardToken: "swile", failed: false, gone: undefined },
    ]);
    // Reported per provider: the admin screen says what each one gave, rather
    // than "never called" about a software that was just read.
    expect(report.byProvider.get("greenhouse")).toEqual({
      failures: 0,
      listingCount: 1,
    });
  });

  it("skips a provider an admin switched off, without counting it", async () => {
    const { store } = createStore([
      makeBoard({ boardToken: "doctolib", provider: "greenhouse" }),
    ]);
    const http = createHttp(() => jsonResponse([]));

    const report = await new BoardsService(store, http).collect(
      new Set(["greenhouse"]),
    );

    expect(report.boardsRead).toBe(0);
    expect(report.byProvider.size).toBe(0);
  });

  it("counts a failure against one company and carries on with the rest", async () => {
    const { fetches, store } = createStore([
      makeBoard({ boardToken: "cassee", provider: "greenhouse" }),
      makeBoard({ boardToken: "swile", provider: "lever" }),
    ]);
    const http = createHttp((url) =>
      url.includes("greenhouse") ? jsonResponse({}, 500) : jsonResponse([]),
    );

    const report = await new BoardsService(store, http).collect();

    expect(report).toMatchObject({ boardsFailed: 1, boardsRead: 1 });
    expect(fetches[0]).toMatchObject({ boardToken: "cassee", failed: true });
  });

  it("retires a board that has vanished", async () => {
    const { fetches, store } = createStore([makeBoard({ boardToken: "partie" })]);
    const http = createHttp(() => jsonResponse({}, 404));

    const report = await new BoardsService(store, http).collect();

    expect(report.boardsRetired).toBe(1);
    expect(fetches[0]).toMatchObject({ failed: true, gone: true });
  });

  it("leaves a provider with no adapter completely alone", async () => {
    const { fetches, store } = createStore([
      makeBoard({ boardToken: "gorgias", provider: "workable" }),
    ]);
    const http = createHttp(() => jsonResponse({}, 500));

    const report = await new BoardsService(store, http).collect();

    // Not read, and above all not counted as a failure: it would be retired
    // after five runs for a reason that is ours, not the company's.
    expect(report).toMatchObject({ boardsFailed: 0, boardsRead: 0 });
    expect(fetches).toEqual([]);
  });
});
