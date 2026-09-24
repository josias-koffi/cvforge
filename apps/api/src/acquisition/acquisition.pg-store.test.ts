import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { acquisitionEvents } from "../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgAcquisitionEventStore } from "./acquisition.pg-store";
import type { NewAcquisitionEvent } from "./acquisition.types";

const EVENT: NewAcquisitionEvent = {
  day: "2026-09-24",
  ipHash: "hash-a",
  locale: "fr",
  step: "view",
  tool: "ats",
};

describe("PgAcquisitionEventStore", () => {
  let testDatabase: TestDatabase;
  let store: PgAcquisitionEventStore;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    store = new PgAcquisitionEventStore(testDatabase.db);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
  });

  const rows = () => testDatabase.db.select().from(acquisitionEvents);

  it("counts a visitor once per step and per day, whatever they reload", async () => {
    await store.record(EVENT);
    await store.record(EVENT);
    await store.record({ ...EVENT, step: "result" });
    await store.record({ ...EVENT, day: "2026-09-25" });
    await store.record({ ...EVENT, ipHash: "hash-b" });

    await expect(rows()).resolves.toHaveLength(4);
  });

  it("refuses a step outside the closed list at the database too", async () => {
    await expect(
      store.record({ ...EVENT, step: "purchase" as never }),
    ).rejects.toThrow();
  });

  it("deletes the days strictly before the cut-off", async () => {
    await store.record({ ...EVENT, day: "2026-06-25" });
    await store.record({ ...EVENT, day: "2026-06-26" });

    await expect(store.deleteBefore("2026-06-26")).resolves.toBe(1);
    await expect(rows()).resolves.toEqual([
      expect.objectContaining({ day: "2026-06-26" }),
    ]);
  });
});
