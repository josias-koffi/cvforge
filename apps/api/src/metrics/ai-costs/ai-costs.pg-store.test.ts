import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { aiUsageEvents } from "../../database/schema";
import { createTestDatabase, type TestDatabase } from "../../database/testing/test-database";
import { PgAiCostsStore } from "./ai-costs.pg-store";

const ALL_TIME = { from: null, to: null };

describe("PgAiCostsStore across providers", () => {
  let database: TestDatabase;
  let store: PgAiCostsStore;

  const insert = (provider: "anthropic" | "openrouter", model: string, costUsd: number) =>
    database.db.insert(aiUsageEvents).values({
      costUsd,
      feature: "cv_generation",
      model,
      provider,
      status: "ok",
    });

  beforeAll(async () => {
    database = await createTestDatabase();
    store = new PgAiCostsStore(database.db);
  });

  afterAll(async () => {
    await database.close();
  });

  beforeEach(async () => {
    await database.reset();
  });

  it("counts only direct Claude calls against the prepaid credit", async () => {
    await insert("anthropic", "claude-haiku-5-5", 1.5);
    await insert("anthropic", "claude-sonnet-5-5", 2);
    await insert("openrouter", "anthropic/claude-haiku-5-5", 9);

    await expect(store.readAnthropicSpend()).resolves.toBe(3.5);
  });

  it("keeps a model apart per provider", async () => {
    await insert("anthropic", "same/model", 1);
    await insert("openrouter", "same/model", 2);

    const models = await store.readByModel(ALL_TIME as never);

    expect(models.map((row) => [row.provider, row.costUsd])).toEqual([
      ["openrouter", 2],
      ["anthropic", 1],
    ]);
  });
});
