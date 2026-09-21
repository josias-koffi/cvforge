import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgCreditOffersStore } from "./offers.pg-store";

// Seeds only exist before the first `reset()`, which truncates every table.
describe("seeded credit offers", () => {
  let testDatabase: TestDatabase;
  let store: PgCreditOffersStore;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    store = new PgCreditOffersStore(testDatabase.db);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  it("sells the launch packs, sized in applications with their interview, with one featured", async () => {
    const active = await store.listActive();

    expect(
      active.map(({ credits, isFeatured, priceCents, slug }) => ({
        credits,
        isFeatured,
        priceCents,
        slug,
      })),
    ).toEqual([
      { credits: 90, isFeatured: false, priceCents: 590, slug: "essentiel" },
      {
        credits: 350,
        isFeatured: true,
        priceCents: 1490,
        slug: "recherche-active",
      },
      { credits: 870, isFeatured: false, priceCents: 2900, slug: "intensif" },
    ]);
  });

  it("archives the historical packs instead of deleting them", async () => {
    const all = await store.listAll();
    const historical = all.filter(
      ({ slug }) => slug === "starter" || slug === "pro",
    );

    expect(
      historical.map(({ status, isFeatured }) => ({ status, isFeatured })),
    ).toEqual([
      { isFeatured: false, status: "archived" },
      { isFeatured: false, status: "archived" },
    ]);
  });
});
