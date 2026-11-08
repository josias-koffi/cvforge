import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { aiUsageEvents } from "../../database/schema";
import { createTestDatabase, type TestDatabase } from "../../database/testing/test-database";
import { PgAnthropicCreditStore } from "./anthropic-credit.pg-store";

const HOUR_MS = 60 * 60 * 1000;

describe("PgAnthropicCreditStore", () => {
  let database: TestDatabase;
  let store: PgAnthropicCreditStore;

  const insertCall = (
    provider: "anthropic" | "openrouter",
    costUsd: number,
    createdAt: Date,
  ) =>
    database.db.insert(aiUsageEvents).values({
      costUsd,
      createdAt,
      feature: "cv_generation",
      model: "claude-haiku-5-5",
      provider,
      status: "ok",
    });

  beforeAll(async () => {
    database = await createTestDatabase();
    store = new PgAnthropicCreditStore(database.db);
  });

  afterAll(async () => {
    await database.close();
  });

  beforeEach(async () => {
    await database.reset();
  });

  it("has nothing to show before a balance is entered", async () => {
    await expect(store.readSummary()).resolves.toBeNull();
  });

  it("counts down only the direct Claude calls made since the entry", async () => {
    await insertCall("anthropic", 50, new Date(Date.now() - HOUR_MS));
    await store.save(200);
    await insertCall("anthropic", 1.5, new Date(Date.now() + HOUR_MS));
    await insertCall("openrouter", 9, new Date(Date.now() + HOUR_MS));

    await expect(store.readSummary()).resolves.toMatchObject({
      recordedUsd: 200,
      remainingUsd: 198.5,
      spentUsd: 1.5,
    });
  });

  it("starts the count again when a new balance is entered", async () => {
    await store.save(10);
    await insertCall("anthropic", 4, new Date(Date.now() + HOUR_MS));
    await store.save(300);
    await database.db.delete(aiUsageEvents);

    await expect(store.readSummary()).resolves.toMatchObject({
      recordedUsd: 300,
      remainingUsd: 300,
      spentUsd: 0,
    });
  });

  it("never shows a negative balance", async () => {
    await store.save(1);
    await insertCall("anthropic", 4, new Date(Date.now() + HOUR_MS));

    await expect(store.readSummary()).resolves.toMatchObject({ remainingUsd: 0 });
  });

  it("forgets the balance when it is cleared", async () => {
    await store.save(10);
    await store.clear();

    await expect(store.readSummary()).resolves.toBeNull();
  });
});
