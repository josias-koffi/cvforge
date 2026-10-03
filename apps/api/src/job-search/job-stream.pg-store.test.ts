import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import {
  PgJobSourceCallsStore,
  PgJobStreamCursorsStore,
} from "./job-stream.pg-store";

const LEASE = 10 * 60_000;
let testDatabase: TestDatabase;
let now = Date.parse("2026-10-01T10:00:00Z");
let cursors: PgJobStreamCursorsStore;
let calls: PgJobSourceCallsStore;

beforeAll(async () => {
  testDatabase = await createTestDatabase();
  cursors = new PgJobStreamCursorsStore(testDatabase.db, () => now);
  calls = new PgJobSourceCallsStore(testDatabase.db);
});

afterAll(async () => {
  await testDatabase.close();
});

beforeEach(async () => {
  await testDatabase.reset();
  now = Date.parse("2026-10-01T10:00:00Z");
});

/** The lock lives in the database: several API instances share it. */
describe("PgJobStreamCursorsStore", () => {
  it("gives the stream to one instance at a time", async () => {
    expect(await cursors.claim("france_travail", "a", LEASE)).toEqual({
      cursorAt: null,
    });
    expect(await cursors.claim("france_travail", "b", LEASE)).toBeNull();

    await cursors.release("france_travail", "a");
    expect(await cursors.claim("france_travail", "b", LEASE)).not.toBeNull();
  });

  it("frees a lease whose process died once it expires", async () => {
    await cursors.claim("france_travail", "dead", LEASE);

    now += LEASE + 1_000;

    expect(await cursors.claim("france_travail", "b", LEASE)).not.toBeNull();
  });

  it("keeps the cursor across leases, moved only by the holder", async () => {
    const at = new Date("2026-10-01T09:55:00Z");
    await cursors.claim("france_travail", "a", LEASE);

    expect(await cursors.advance("france_travail", "b", at, LEASE)).toBe(false);
    expect(await cursors.advance("france_travail", "a", at, LEASE)).toBe(true);
    await cursors.release("france_travail", "a");

    expect(
      (await cursors.claim("france_travail", "b", LEASE))?.cursorAt?.toISOString(),
    ).toBe(at.toISOString());
  });

  it("refuses to move the cursor once the lease was taken over", async () => {
    await cursors.claim("france_travail", "a", LEASE);
    now += LEASE + 1_000;
    await cursors.claim("france_travail", "b", LEASE);

    expect(
      await cursors.advance("france_travail", "a", new Date(now), LEASE),
    ).toBe(false);
  });
});

describe("PgJobSourceCallsStore", () => {
  it("adds up calls per source and day, and totals the month", async () => {
    await calls.add("france_travail", "2026-09-30", 400);
    await calls.add("france_travail", "2026-10-01", 120);
    await calls.add("france_travail", "2026-10-01", 30);
    await calls.add("greenhouse", "2026-10-01", 7);

    const totals = await calls.totals("2026-10-01", "2026-10-01");

    expect(totals.get("france_travail")).toEqual({ month: 150, today: 150 });
    expect(totals.get("greenhouse")).toEqual({ month: 7, today: 7 });
    expect(
      (await calls.totals("2026-10-01", "2026-09-01")).get("france_travail"),
    ).toEqual({ month: 550, today: 150 });
  });
});
