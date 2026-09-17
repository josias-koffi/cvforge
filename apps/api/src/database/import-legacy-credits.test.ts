import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PgCreditLedgerStore } from "../credits/credits.pg-store";
import { importLegacyCredits } from "./import-legacy-credits";
import { createTestDatabase, type TestDatabase } from "./testing/test-database";

const LEGACY_ENTRIES = [
  {
    action: "cv_generation",
    amount: -3,
    balanceAfter: 547,
    createdAt: "2026-05-02T10:00:00.000Z",
    id: "5f0c7c2e-8a41-4c1b-9d7e-2b8f6a1d3c44",
    metadata: { applicationId: "app-1" },
    note: "Generation CV",
    type: "ai_usage",
    userEmail: "user@example.com",
  },
  {
    action: "stripe_purchase",
    amount: 550,
    balanceAfter: 550,
    createdAt: "2026-05-01T10:00:00.000Z",
    id: "legacy-non-uuid",
    metadata: { packId: "starter", stripeCheckoutSessionId: "cs_legacy" },
    note: "Achat Stripe starter (999 cents)",
    type: "stripe_purchase",
    userEmail: "user@example.com",
  },
];

describe("importLegacyCredits", () => {
  let testDatabase: TestDatabase;
  let store: PgCreditLedgerStore;
  const directory = mkdtempSync(join(tmpdir(), "cvforge-legacy-"));

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    store = new PgCreditLedgerStore(testDatabase.db);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
  });

  it("imports entries in order, restores balances and runs only once", async () => {
    const filePath = join(directory, "credits-state.json");
    writeFileSync(filePath, JSON.stringify({ entries: LEGACY_ENTRIES }));

    await expect(importLegacyCredits(testDatabase.db, filePath)).resolves.toEqual({
      entries: 2,
      status: "imported",
      users: 1,
    });
    await expect(importLegacyCredits(testDatabase.db, filePath)).resolves.toEqual({
      status: "already_imported",
    });

    const history = await store.listEntriesForUser("user@example.com");

    expect(history.map((entry) => entry.amount)).toEqual([-3, 550]);
    expect(history[0].id).toBe(LEGACY_ENTRIES[0].id);
    await expect(store.getBalance("user@example.com")).resolves.toBe(547);
  });

  it("keeps a legacy Stripe purchase idempotent after the import", async () => {
    const filePath = join(directory, "credits-stripe.json");
    writeFileSync(filePath, JSON.stringify({ entries: LEGACY_ENTRIES }));
    await importLegacyCredits(testDatabase.db, filePath);

    const replay = await store.applyEntry(
      {
        action: "stripe_purchase",
        amount: 550,
        metadata: {},
        note: null,
        type: "stripe_purchase",
        userEmail: "user@example.com",
      },
      "stripe:checkout:cs_legacy",
    );

    expect(replay.status).toBe("duplicate");
  });

  it("marks a missing file as imported without writing entries", async () => {
    await expect(
      importLegacyCredits(testDatabase.db, join(directory, "missing.json")),
    ).resolves.toEqual({ entries: 0, status: "imported", users: 0 });
  });
});
