import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgJobSourcesStore } from "./job-sources.pg-store";

let testDatabase: TestDatabase;
let store: PgJobSourcesStore;

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  store = new PgJobSourcesStore(testDatabase.db);
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.reset();
});

describe("PgJobSourcesStore", () => {
  it("says nothing about a source nobody touched", async () => {
    // The list of sources lives in the code; this table only records what was
    // decided about them and what they last did.
    expect(await store.list()).toEqual([]);
    expect(await store.listDisabled()).toEqual(new Set());
  });

  it("switches a source off, and back on", async () => {
    expect(await store.setEnabled("france_travail", false)).toMatchObject({
      enabled: false,
    });
    expect(await store.listDisabled()).toEqual(new Set(["france_travail"]));

    await store.setEnabled("france_travail", true);
    expect(await store.listDisabled()).toEqual(new Set());
  });

  it("keeps the other sources enabled when one is switched off", async () => {
    // A source added later must be collected from the day its adapter lands,
    // not skipped because nobody wrote a row for it.
    await store.setEnabled("adzuna", false);

    const disabled = await store.listDisabled();
    expect(disabled.has("adzuna")).toBe(true);
    expect(disabled.has("france_travail")).toBe(false);
  });

  it("clears the failure count when a source is put back", async () => {
    await store.recordRun("france_travail", {
      failed: true,
      listingCount: 0,
      status: "timeout",
    });
    await store.setEnabled("france_travail", false);
    await store.setEnabled("france_travail", true);

    const [source] = (await store.list()).filter(
      (entry) => entry.source === "france_travail",
    );
    expect(source?.consecutiveFailures).toBe(0);
  });

  it("remembers what the last run gave, and keeps the count on failure", async () => {
    await store.recordRun("france_travail", {
      failed: false,
      listingCount: 42,
      status: "ok",
    });
    await store.recordRun("france_travail", {
      failed: true,
      listingCount: 0,
      status: "France Travail answered 400",
    });

    const [source] = (await store.list()).filter(
      (entry) => entry.source === "france_travail",
    );
    // The last successful figure survives a failure: showing 0 would read as
    // "this source finds nothing", which is a different problem entirely.
    expect(source).toMatchObject({
      consecutiveFailures: 1,
      lastListingCount: 42,
      lastStatus: "France Travail answered 400",
    });
  });

  it("records a source that had no row yet", async () => {
    await store.recordRun("greenhouse", {
      failed: false,
      listingCount: 7,
      status: "ok",
    });

    expect(await store.list()).toMatchObject([
      { enabled: true, lastListingCount: 7, source: "greenhouse" },
    ]);
  });
});
