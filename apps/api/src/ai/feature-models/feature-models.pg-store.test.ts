import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase, type TestDatabase } from "../../database/testing/test-database";
import { PgFeatureModelsStore } from "./feature-models.pg-store";

describe("PgFeatureModelsStore", () => {
  let database: TestDatabase;
  let store: PgFeatureModelsStore;

  beforeAll(async () => {
    database = await createTestDatabase();
    store = new PgFeatureModelsStore(database.db);
  });

  afterAll(async () => {
    await database.close();
  });

  beforeEach(async () => {
    await database.reset();
  });

  it("starts empty, so nothing changes until someone chooses", async () => {
    await expect(store.listAll()).resolves.toEqual([]);
  });

  it("replaces a feature's model rather than stacking rows", async () => {
    await store.save("cv_import", { model: "claude-haiku-5-5", provider: "anthropic" });
    await store.save("cv_import", { model: "openai/gpt-4.1-mini", provider: "openrouter" });

    await expect(store.listAll()).resolves.toEqual([
      { feature: "cv_import", model: "openai/gpt-4.1-mini", provider: "openrouter" },
    ]);
  });

  it("goes back to the default when the row is removed", async () => {
    await store.save("cv_import", { model: "claude-haiku-5-5", provider: "anthropic" });
    await store.remove("cv_import");

    await expect(store.listAll()).resolves.toEqual([]);
  });
});
