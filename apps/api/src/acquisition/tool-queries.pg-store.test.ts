import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { toolQueries } from "../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgToolQueryStore } from "./tool-queries.pg-store";
import type { NewToolQuery } from "./tool-queries.types";

const QUERY: NewToolQuery = {
  day: "2026-09-25",
  label: "HELPLINE",
  place: "",
  queryKey: "381983568",
  tool: "company_check",
};

describe("PgToolQueryStore", () => {
  let testDatabase: TestDatabase;
  let store: PgToolQueryStore;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    store = new PgToolQueryStore(testDatabase.db);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
  });

  const rows = () => testDatabase.db.select().from(toolQueries);

  it("counts the same search on the same day in one row", async () => {
    await store.increment(QUERY);
    await store.increment({ ...QUERY, label: "HELPLINE SA" });
    await store.increment({ ...QUERY, day: "2026-09-26" });

    const all = await rows();
    expect(all).toHaveLength(2);
    expect(all.find((row) => row.day === "2026-09-25")).toMatchObject({
      hits: 2,
      label: "HELPLINE SA",
    });
  });

  it("keeps a job searched in two departments apart", async () => {
    const job = { ...QUERY, queryKey: "38874", tool: "job_market" as const };
    await store.increment({ ...job, place: "Paris" });
    await store.increment({ ...job, place: "Gironde" });

    await expect(rows()).resolves.toHaveLength(2);
  });

  it("drops the days before the cutoff", async () => {
    await store.increment({ ...QUERY, day: "2025-01-01" });
    await store.increment(QUERY);

    await expect(store.deleteBefore("2026-01-01")).resolves.toBe(1);
    await expect(rows()).resolves.toHaveLength(1);
  });
});
