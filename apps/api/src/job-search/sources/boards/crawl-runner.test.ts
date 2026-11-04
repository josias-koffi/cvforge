import { describe, expect, it, vi } from "vitest";
import { BoardNotFoundError, BoardRefusedError } from "./board.types";
import { CrawlRunner } from "./crawl-runner";
import type { BoardProvider } from "./detect-board";
import type { NormalizedJobListing } from "../../job-search.types";

const OFFER = { externalId: "1" } as NormalizedJobListing;
const lines = (...urls: string[]) => urls.map((url) => JSON.stringify({ url })).join("\n");

/** An index that answers per URL; anything not listed answers 504. */
function index(answers: Record<string, string | number>) {
  return vi.fn(async (input: unknown) => {
    const url = String(input);
    const key = Object.keys(answers).find((candidate) => url.includes(candidate));
    const answer = key === undefined ? 504 : answers[key]!;

    return typeof answer === "number"
      ? new Response("", { status: answer })
      : new Response(answer);
  });
}

function setup(options: {
  answers: Record<string, string | number>;
  known?: string[];
  verify?: (token: string) => Promise<NormalizedJobListing[]>;
}) {
  const known = new Set(options.known ?? []);
  const registered: string[] = [];
  const disabled: string[] = [];
  const store = {
    find: vi.fn(async (provider: BoardProvider, token: string) =>
      known.has(`${provider}/${token}`) ? ({} as never) : null,
    ),
    register: vi.fn(async (board: { provider: BoardProvider; boardToken: string }) => {
      registered.push(`${board.provider}/${board.boardToken}`);
      return {} as never;
    }),
    setEnabled: vi.fn(async (provider: BoardProvider, token: string) => {
      disabled.push(`${provider}/${token}`);
      return null;
    }),
  };
  const verify = options.verify ?? (async () => [OFFER]);
  const fetchImpl = index(options.answers);
  const runner = new CrawlRunner({
    fetchImpl: fetchImpl as unknown as typeof globalThis.fetch,
    random: () => 0,
    sleep: async () => {},
    store,
    verifiers: { greenhouse: { fetchBoard: verify, provider: "greenhouse" } },
  });

  return { disabled, fetchImpl, registered, runner, store };
}

const GREENHOUSE = "boards.greenhouse.io";
const base = {
  "collinfo.json": JSON.stringify([{ id: "CC-MAIN-2026-43" }, { id: "CC-MAIN-2026-39" }]),
};

describe("CrawlRunner", () => {
  it("registers a company that shows an offer, and records the others as disabled", async () => {
    const { disabled, registered, runner } = setup({
      answers: {
        ...base,
        [`${GREENHOUSE}%2F*&output=json&fl=url&showNumPages`]: '{"pages":1}',
        [`${GREENHOUSE}%2F*&output=json&fl=url&page=0`]: lines(
          "https://boards.greenhouse.io/alpha/jobs/1",
          "https://boards.greenhouse.io/empty/jobs/1",
          "https://boards.greenhouse.io/gone/jobs/1",
        ),
      },
      verify: async (token) => {
        if (token === "gone") throw new BoardNotFoundError("greenhouse", token);
        return token === "empty" ? [] : [OFFER];
      },
    });

    const report = await runner.run({ provider: "greenhouse" });

    expect(registered.sort()).toEqual(["greenhouse/alpha", "greenhouse/empty", "greenhouse/gone"]);
    expect(disabled.sort()).toEqual(["greenhouse/empty", "greenhouse/gone"]);
    expect(report).toMatchObject({ candidates: 3, empty: 1, gone: 1, registered: 1 });
  });

  it("falls back to the previous crawl when the newest one answers 504", async () => {
    const { runner } = setup({
      answers: {
        ...base,
        "CC-MAIN-2026-39-index?url=boards.greenhouse.io%2F*&output=json&fl=url&showNumPages": '{"pages":1}',
        "CC-MAIN-2026-39-index?url=boards.greenhouse.io%2F*&output=json&fl=url&page=0": lines(
          "https://boards.greenhouse.io/alpha/jobs/1",
        ),
      },
    });

    const report = await runner.run({ provider: "greenhouse" });

    const greenhouse = report.patterns.find((entry) => entry.pattern === "boards.greenhouse.io/*");
    expect(greenhouse).toMatchObject({ candidates: 1, collection: "CC-MAIN-2026-39" });
    expect(report.registered).toBe(1);
  });

  it("reports the patterns no crawl could answer, and registers nothing", async () => {
    const { registered, runner } = setup({ answers: {} });

    const report = await runner.run({ provider: "greenhouse" });

    expect(report.patterns.every((entry) => entry.collection === null)).toBe(true);
    expect(report.indexFailures).toBeGreaterThan(0);
    expect(registered).toEqual([]);
  });

  it("leaves the known companies alone and defers what the budget cannot cover", async () => {
    const { registered, runner } = setup({
      answers: {
        ...base,
        [`${GREENHOUSE}%2F*&output=json&fl=url&showNumPages`]: '{"pages":1}',
        [`${GREENHOUSE}%2F*&output=json&fl=url&page=0`]: lines(
          "https://boards.greenhouse.io/known/jobs/1",
          "https://boards.greenhouse.io/one/jobs/1",
          "https://boards.greenhouse.io/two/jobs/1",
        ),
      },
      known: ["greenhouse/known"],
    });

    const report = await runner.run({ provider: "greenhouse", verifyBudget: 1 });

    expect(report).toMatchObject({ alreadyKnown: 1, deferred: 1, registered: 1 });
    expect(registered).toHaveLength(1);
  });

  it("records nothing about a company it could not verify, and stops asking a provider that refuses", async () => {
    const verify = vi.fn(async (): Promise<NormalizedJobListing[]> => {
      throw new BoardRefusedError("greenhouse", 429);
    });
    const { registered, runner } = setup({
      answers: {
        ...base,
        [`${GREENHOUSE}%2F*&output=json&fl=url&showNumPages`]: '{"pages":1}',
        [`${GREENHOUSE}%2F*&output=json&fl=url&page=0`]: lines(
          "https://boards.greenhouse.io/one/jobs/1",
          "https://boards.greenhouse.io/two/jobs/1",
          "https://boards.greenhouse.io/three/jobs/1",
        ),
      },
      verify,
    });

    const report = await runner.run({ provider: "greenhouse" });

    expect(registered).toEqual([]);
    expect(report.unverified).toBe(3);
    // The first 429 ended the provider's turn: the other two were never asked.
    expect(verify).toHaveBeenCalledTimes(1);
  });
});
