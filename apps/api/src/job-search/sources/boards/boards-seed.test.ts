import { describe, expect, it } from "vitest";
import { boardProviders } from "./detect-board";
import { importSeededBoards } from "./boards-seed";
import { SEEDED_BOARDS } from "./boards.seed";
import type { BoardsService } from "../../boards.service";

type Register = Pick<BoardsService, "register">["register"];

function makeBoards(register: Register): Pick<BoardsService, "register"> {
  return { register };
}

describe("SEEDED_BOARDS", () => {
  it("only names providers that can actually be collected", () => {
    // A token under a provider with no adapter would sit in the registry
    // forever without ever being read.
    for (const board of SEEDED_BOARDS) {
      expect(boardProviders).toContain(board.provider);
    }
  });

  it("has no duplicate company", () => {
    const keys = SEEDED_BOARDS.map(
      (board) => `${board.provider}/${board.boardToken}`,
    );

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("names every company, so the admin screen is readable", () => {
    for (const board of SEEDED_BOARDS) {
      expect(board.companyName.trim()).not.toBe("");
      expect(board.boardToken.trim()).not.toBe("");
    }
  });
});

describe("importSeededBoards", () => {
  it("registers every company, with the seed origin", async () => {
    const registered: unknown[] = [];
    const register: Register = async (board) => {
      registered.push(board);

      return null;
    };

    const report = await importSeededBoards(makeBoards(register));

    expect(report.skipped).toBe(SEEDED_BOARDS.length);
    expect(registered).toHaveLength(SEEDED_BOARDS.length);
    expect(registered[0]).toMatchObject({ origin: "seed" });
  });

  it("counts the ones the registry accepted", async () => {
    const register: Register = async (board) => ({
      boardToken: board.boardToken,
      companyName: board.companyName ?? "",
      consecutiveFailures: 0,
      createdAt: new Date().toISOString(),
      enabled: true,
      lastFetchedAt: null,
      lastJobCount: 0,
      lastStatus: "",
      origin: board.origin,
      provider: board.provider,
    });

    const report = await importSeededBoards(makeBoards(register));

    expect(report).toEqual({ registered: SEEDED_BOARDS.length, skipped: 0 });
  });
});
