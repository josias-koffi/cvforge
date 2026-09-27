import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgJobDigestRunsStore } from "./matches.pg-store";

let testDatabase: TestDatabase;
let store: PgJobDigestRunsStore;

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  store = new PgJobDigestRunsStore(testDatabase.db);
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.reset();
});

/**
 * The lock lives in the database, not in the service: the API can run several
 * instances, and a flag in memory would let each one collect at the same time.
 * These tests therefore run against real SQL.
 */
describe("PgJobDigestRunsStore", () => {
  it("lets exactly one morning selection through per day", async () => {
    expect(await store.claim("2026-09-23", "digest")).not.toBeNull();
    expect(await store.claim("2026-09-23", "digest")).toBeNull();
  });

  it("refuses a second collection while one is running", async () => {
    const first = await store.claim("2026-09-23", "collect");

    expect(first).not.toBeNull();
    expect(await store.claim("2026-09-23", "collect")).toBeNull();

    await store.finish(first!.id, { stats: {}, status: "done" });

    // Once the first finished, the next one is allowed — the lock is about
    // running at the same time, not about the day.
    expect(await store.claim("2026-09-23", "collect")).not.toBeNull();
  });

  it("keeps several runs of the same day, instead of overwriting", async () => {
    const digest = await store.claim("2026-09-23", "digest");
    await store.finish(digest!.id, {
      stats: { listingsCollected: 10 },
      status: "done",
    });

    const collect = await store.claim("2026-09-23", "collect");
    await store.finish(collect!.id, {
      stats: { listingsCollected: 400 },
      status: "done",
    });

    const history = await store.list(10);
    expect(history).toHaveLength(2);
    // The day's figures survive a collection asked for by hand afterwards.
    expect(await store.find("2026-09-23")).toMatchObject({
      kind: "digest",
      stats: { listingsCollected: 10 },
    });
  });

  it("frees a run whose process is gone, and only that one", async () => {
    const stale = await store.claim("2026-09-23", "collect");
    // Reaches back in time rather than waiting two hours.
    await testDatabase.db.execute(
      sql`update job_digest_runs set started_at = now() - interval '3 hours' where id = ${stale!.id}`,
    );

    expect(await store.recoverStale(2 * 60 * 60_000)).toBe(1);
    expect(await store.claim("2026-09-23", "collect")).not.toBeNull();
  });

  it("leaves a run that is genuinely under way alone", async () => {
    await store.claim("2026-09-23", "collect");

    expect(await store.recoverStale(2 * 60 * 60_000)).toBe(0);
    // Still locked, which is the point.
    expect(await store.claim("2026-09-23", "collect")).toBeNull();
  });

  it("gives the day back so the selection can be asked for again", async () => {
    const digest = await store.claim("2026-09-23", "digest");
    await store.finish(digest!.id, { stats: {}, status: "done" });

    expect(await store.release("2026-09-23")).toBe(true);
    expect(await store.claim("2026-09-23", "digest")).not.toBeNull();
  });
});
