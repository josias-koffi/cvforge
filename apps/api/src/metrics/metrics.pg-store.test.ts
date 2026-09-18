import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import {
  applications,
  authAccounts,
  creditLedgerEntries,
  creditOrders,
  interviewSessions,
} from "../database/schema";
import { createSellableOffer } from "../billing/testing/billing-fixtures";
import { PgMetricsStore } from "./metrics.pg-store";

const NOW = Date.now();
const DAY = 86_400_000;

describe("PgMetricsStore", () => {
  let testDatabase: TestDatabase;
  let store: PgMetricsStore;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    store = new PgMetricsStore(testDatabase.db);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
  });

  async function insertLedgerEntry(entry: {
    action: string;
    amount: number;
    createdAt: Date;
    type: string;
    userEmail: string;
  }) {
    await testDatabase.db.insert(creditLedgerEntries).values({
      action: entry.action as never,
      amount: entry.amount,
      balanceAfter: 0,
      createdAt: entry.createdAt,
      type: entry.type as never,
      userEmail: entry.userEmail,
    });
  }

  async function insertApplication(userEmail: string, createdAt: Date) {
    await testDatabase.db.insert(applications).values({
      createdAt,
      extracted: {} as never,
      id: `app-${userEmail}-${createdAt.getTime()}`,
      sourceType: "text",
      status: "draft" as never,
      updatedAt: createdAt,
      userEmail,
    });
  }

  it("returns zeroes on an empty database", async () => {
    await expect(store.readProductCounters(30)).resolves.toMatchObject({
      activeUserCount: 0,
      creditsConsumed: 0,
      generatedCvCount: 0,
      grossRevenueCents: 0,
      paidOrderCount: 0,
      totalUserCount: 0,
    });
  });

  it("counts documents from the ledger, by action", async () => {
    const entries = [
      { action: "cv_generation", amount: -3 },
      { action: "cv_generation", amount: -3 },
      { action: "letter_generation", amount: -3 },
      { action: "cv_import", amount: -2 },
      { action: "offer_enrichment", amount: -1 },
    ];

    for (const entry of entries) {
      await insertLedgerEntry({
        ...entry,
        createdAt: new Date(NOW),
        type: "ai_usage",
        userEmail: "user@example.com",
      });
    }

    await expect(store.readProductCounters(30)).resolves.toMatchObject({
      creditsConsumed: 12,
      cvImportCount: 1,
      generatedCvCount: 2,
      generatedLetterCount: 1,
      offerEnrichmentCount: 1,
    });
  });

  it("separates credits sold, granted and consumed", async () => {
    await insertLedgerEntry({
      action: "stripe_purchase",
      amount: 550,
      createdAt: new Date(NOW),
      type: "stripe_purchase",
      userEmail: "buyer@example.com",
    });
    await insertLedgerEntry({
      action: "admin_grant",
      amount: 50,
      createdAt: new Date(NOW),
      type: "admin_grant",
      userEmail: "buyer@example.com",
    });
    await insertLedgerEntry({
      action: "cv_generation",
      amount: -3,
      createdAt: new Date(NOW),
      type: "ai_usage",
      userEmail: "buyer@example.com",
    });

    await expect(store.readProductCounters(30)).resolves.toMatchObject({
      creditsConsumed: 3,
      creditsGranted: 50,
      creditsSold: 550,
    });
  });

  it("sums revenue from paid orders only", async () => {
    const offer = await createSellableOffer(testDatabase.db);
    const baseOrder = {
      credits: offer.credits,
      currency: "eur" as const,
      offerId: offer.id,
      offerName: offer.name,
      priceCents: 599,
      userEmail: "buyer@example.com",
    };

    await testDatabase.db.insert(creditOrders).values([
      { ...baseOrder, status: "paid" as never },
      { ...baseOrder, status: "paid" as never },
      { ...baseOrder, status: "pending" as never },
      { ...baseOrder, status: "failed" as never },
    ]);

    await expect(store.readProductCounters(30)).resolves.toMatchObject({
      grossRevenueCents: 1198,
      paidOrderCount: 2,
    });
  });

  it("counts accounts and admins", async () => {
    await testDatabase.db.insert(authAccounts).values([
      { email: "admin@example.com", role: "admin" },
      { email: "user@example.com", role: "user" },
      { email: "other@example.com", role: "user" },
    ]);

    await expect(store.readProductCounters(30)).resolves.toMatchObject({
      totalAdminCount: 1,
      totalUserCount: 3,
    });
  });

  it("counts interviews, total and completed", async () => {
    await testDatabase.db.insert(interviewSessions).values([
      {
        aiStatus: "idle" as never,
        completedAt: new Date(NOW),
        createdAt: new Date(NOW),
        id: "interview-1",
        profile: "neutral" as never,
        status: "completed" as never,
        updatedAt: new Date(NOW),
        userEmail: "user@example.com",
      },
      {
        aiStatus: "idle" as never,
        createdAt: new Date(NOW),
        id: "interview-2",
        profile: "neutral" as never,
        status: "ready" as never,
        updatedAt: new Date(NOW),
        userEmail: "user@example.com",
      },
    ]);

    await expect(store.readProductCounters(30)).resolves.toMatchObject({
      interviewCompletedCount: 1,
      interviewCount: 2,
    });
  });

  it("counts an active account once, from either usage source, inside the window", async () => {
    // Two activity kinds for the same account: still one active user.
    await insertApplication("both@example.com", new Date(NOW - 2 * DAY));
    await insertLedgerEntry({
      action: "cv_generation",
      amount: -3,
      createdAt: new Date(NOW - DAY),
      type: "ai_usage",
      userEmail: "both@example.com",
    });
    // Ledger activity only.
    await insertLedgerEntry({
      action: "cv_generation",
      amount: -3,
      createdAt: new Date(NOW - 3 * DAY),
      type: "ai_usage",
      userEmail: "ledger@example.com",
    });
    // Application only.
    await insertApplication("app@example.com", new Date(NOW - 5 * DAY));
    // Outside the window.
    await insertApplication("stale@example.com", new Date(NOW - 40 * DAY));

    await expect(store.readProductCounters(30)).resolves.toMatchObject({
      activeUserCount: 3,
      applicationCount: 3,
    });
  });

  it("narrows the active count with a shorter window", async () => {
    await insertApplication("recent@example.com", new Date(NOW - 2 * DAY));
    await insertApplication("older@example.com", new Date(NOW - 20 * DAY));

    await expect(store.readProductCounters(7)).resolves.toMatchObject({
      activeUserCount: 1,
    });
    await expect(store.readProductCounters(30)).resolves.toMatchObject({
      activeUserCount: 2,
    });
  });

  it("ignores a purchase when counting active usage", async () => {
    // Buying credits is not using the product; only ai_usage counts.
    await insertLedgerEntry({
      action: "stripe_purchase",
      amount: 550,
      createdAt: new Date(NOW),
      type: "stripe_purchase",
      userEmail: "buyer@example.com",
    });

    await expect(store.readProductCounters(30)).resolves.toMatchObject({
      activeUserCount: 0,
    });
  });
});
