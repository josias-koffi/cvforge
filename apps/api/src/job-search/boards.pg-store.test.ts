import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgJobBoardsStore } from "./boards.pg-store";

let testDatabase: TestDatabase;
let store: PgJobBoardsStore;

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  store = new PgJobBoardsStore(testDatabase.db);
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.reset();
});

describe("PgJobBoardsStore", () => {
  it("registers a company once, whatever finds it again", async () => {
    await store.register({
      boardToken: "doctolib",
      companyName: "Doctolib",
      origin: "crawl",
      provider: "greenhouse",
    });
    await store.register({
      boardToken: "doctolib",
      origin: "user",
      provider: "greenhouse",
    });

    const boards = await store.list();

    expect(boards).toHaveLength(1);
    expect(boards[0]).toMatchObject({
      companyName: "Doctolib",
      enabled: true,
      origin: "crawl",
    });
  });

  it("fills in a company name that was missing, and never overwrites one", async () => {
    await store.register({ boardToken: "acme", origin: "crawl", provider: "lever" });
    await store.register({
      boardToken: "acme",
      companyName: "ACME SAS",
      origin: "user",
      provider: "lever",
    });
    await store.register({
      boardToken: "acme",
      companyName: "Autre nom",
      origin: "user",
      provider: "lever",
    });

    expect((await store.find("lever", "acme"))?.companyName).toBe("ACME SAS");
  });

  it("keeps the same token apart across providers", async () => {
    await store.register({ boardToken: "acme", origin: "crawl", provider: "lever" });
    await store.register({ boardToken: "acme", origin: "crawl", provider: "ashby" });

    expect(await store.list()).toHaveLength(2);
    expect(await store.list({ provider: "ashby" })).toHaveLength(1);
  });

  it("never re-enables a board an admin disabled", async () => {
    await store.register({ boardToken: "acme", origin: "crawl", provider: "lever" });
    await store.setEnabled("lever", "acme", false);

    await store.register({ boardToken: "acme", origin: "user", provider: "lever" });

    expect((await store.find("lever", "acme"))?.enabled).toBe(false);
    expect(await store.listEnabled()).toEqual([]);
  });

  it("records a successful collection and clears past failures", async () => {
    await store.register({ boardToken: "acme", origin: "crawl", provider: "lever" });
    await store.recordFetch("lever", "acme", {
      failed: true,
      jobCount: 0,
      status: "500",
    });

    const board = await store.recordFetch("lever", "acme", {
      failed: false,
      jobCount: 12,
      status: "ok",
    });

    expect(board).toMatchObject({
      consecutiveFailures: 0,
      enabled: true,
      lastJobCount: 12,
      lastStatus: "ok",
    });
    expect(board?.lastFetchedAt).not.toBeNull();
  });

  it("retires a company after five failures in a row", async () => {
    await store.register({ boardToken: "acme", origin: "crawl", provider: "lever" });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await store.recordFetch("lever", "acme", {
        failed: true,
        jobCount: 0,
        status: "timeout",
      });
    }

    expect((await store.find("lever", "acme"))?.enabled).toBe(true);

    const board = await store.recordFetch("lever", "acme", {
      failed: true,
      jobCount: 0,
      status: "timeout",
    });

    expect(board?.enabled).toBe(false);
    // A failed run must not erase the count of the last good one.
    expect(board?.lastJobCount).toBe(0);
  });

  it("retires a vanished board at once, without waiting five times", async () => {
    await store.register({ boardToken: "partie", origin: "crawl", provider: "lever" });

    const board = await store.recordFetch("lever", "partie", {
      failed: true,
      gone: true,
      jobCount: 0,
      status: "404",
    });

    expect(board?.enabled).toBe(false);
  });

  it("clears the failures when an admin puts a board back", async () => {
    await store.register({ boardToken: "acme", origin: "crawl", provider: "lever" });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await store.recordFetch("lever", "acme", {
        failed: true,
        jobCount: 0,
        status: "timeout",
      });
    }

    const board = await store.setEnabled("lever", "acme", true);

    expect(board).toMatchObject({ consecutiveFailures: 0, enabled: true });
  });

  it("does not put a disabled board back after a successful read", async () => {
    await store.register({ boardToken: "acme", origin: "crawl", provider: "lever" });
    await store.setEnabled("lever", "acme", false);

    const board = await store.recordFetch("lever", "acme", {
      failed: false,
      jobCount: 7,
      status: "ok",
    });

    expect(board?.enabled).toBe(false);
  });

  it("serves the enabled boards, the least recently fetched first", async () => {
    await store.register({ boardToken: "first", origin: "crawl", provider: "lever" });
    await store.register({ boardToken: "second", origin: "crawl", provider: "lever" });
    await store.recordFetch("lever", "first", {
      failed: false,
      jobCount: 1,
      status: "ok",
    });

    const enabled = await store.listEnabled();

    // "second" was never fetched, so it goes first.
    expect(enabled.map((board) => board.boardToken)).toEqual(["second", "first"]);
  });
});
