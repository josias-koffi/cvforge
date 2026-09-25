import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { aiUsageEvents } from "../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgAiUsageRecorder } from "./ai-usage.pg-recorder";

describe("PgAiUsageRecorder", () => {
  let testDatabase: TestDatabase;
  let recorder: PgAiUsageRecorder;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    recorder = new PgAiUsageRecorder(testDatabase.db);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
  });

  it("stores one row per call, cost kept to the micro-dollar", async () => {
    await recorder.record({
      completionTokens: 30,
      costUsd: 0.004213,
      durationMs: 1200,
      fellBack: true,
      feature: "cv_generation",
      model: "openai/gpt-4.1-nano",
      promptTokens: 500,
      status: "ok",
    });

    const rows = await testDatabase.db.select().from(aiUsageEvents);
    expect(rows).toEqual([
      expect.objectContaining({
        costUsd: 0.004213,
        feature: "cv_generation",
        fellBack: true,
        model: "openai/gpt-4.1-nano",
        promptTokens: 500,
      }),
    ]);
  });

  it("refuses a status outside the closed list", async () => {
    await expect(
      recorder.record({
        completionTokens: 0,
        costUsd: 0,
        durationMs: 0,
        fellBack: false,
        feature: "other",
        model: "m",
        promptTokens: 0,
        status: "pending" as never,
      }),
    ).rejects.toThrow();
  });
});
