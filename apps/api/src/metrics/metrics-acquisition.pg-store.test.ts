import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { LEAD_OFFER_SOURCE_LABEL } from "../applications/applications.types";
import {
  acquisitionEvents,
  applications,
  atsScans,
  authAccounts,
} from "../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgMetricsStore } from "./metrics.pg-store";

const WINDOW_START = new Date("2026-09-01T00:00:00.000Z");

describe("PgMetricsStore — acquisition funnels", () => {
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

  async function seedEvent(
    day: string,
    step: "view" | "result",
    ipHash: string,
  ) {
    await testDatabase.db
      .insert(acquisitionEvents)
      .values({ day, ipHash, locale: "fr", step, tool: "ats" });
  }

  it("counts visitors per tool and step, from the first day of the window", async () => {
    await seedEvent("2026-08-31", "view", "before-window");
    await seedEvent("2026-09-01", "view", "a");
    await seedEvent("2026-09-02", "view", "b");
    await seedEvent("2026-09-02", "result", "b");

    const rows = await store.readAcquisitionSteps("2026-09-01");

    expect(rows).toHaveLength(2);
    expect(rows).toEqual(
      expect.arrayContaining([
        { step: "view", tool: "ats", visitors: 2 },
        { step: "result", tool: "ats", visitors: 1 },
      ]),
    );
  });

  async function seedUnlockedScan(id: string, email: string, unlockedAt: Date) {
    await testDatabase.db.insert(atsScans).values({
      email,
      engineVersion: "1.1.0",
      expiresAt: new Date("2026-12-31T00:00:00.000Z"),
      id,
      overallScore: 70,
      result: {} as never,
      source: "public",
      unlockedAt,
    });
  }

  async function seedAccount(email: string) {
    await testDatabase.db.insert(authAccounts).values({
      createdAt: WINDOW_START,
      email,
      role: "user",
      status: "active",
    });
  }

  it("counts the ATS leads unlocked in the window that now have an account", async () => {
    const inWindow = new Date("2026-09-10T00:00:00.000Z");

    await seedUnlockedScan(
      "11111111-1111-4111-8111-111111111111",
      "in@example.com",
      inWindow,
    );
    // Scanned twice: still one person.
    await seedUnlockedScan(
      "22222222-2222-4222-8222-222222222222",
      "in@example.com",
      inWindow,
    );
    await seedUnlockedScan(
      "33333333-3333-4333-8333-333333333333",
      "old@example.com",
      new Date("2026-08-01T00:00:00.000Z"),
    );
    await seedUnlockedScan(
      "44444444-4444-4444-8444-444444444444",
      "lead@example.com",
      inWindow,
    );
    await seedAccount("in@example.com");
    await seedAccount("old@example.com");

    await expect(store.readAtsActivations(WINDOW_START)).resolves.toBe(1);
  });

  async function seedApplication(
    id: string,
    email: string,
    source: string,
    createdAt: Date,
  ) {
    await testDatabase.db.insert(applications).values({
      createdAt,
      extracted: {} as never,
      id,
      sourceLabel: source,
      sourceType: "text",
      status: "draft",
      updatedAt: createdAt,
      userEmail: email,
    });
  }

  /** The comparator keeps no address: the offered application is the proof (US-136). */
  it("counts the accounts whose comparator link created their application", async () => {
    const inWindow = new Date("2026-09-10T00:00:00.000Z");

    await seedApplication(
      "a1",
      "lead@example.com",
      LEAD_OFFER_SOURCE_LABEL,
      inWindow,
    );
    // A second comparator link from the same person: still one account.
    await seedApplication(
      "a2",
      "lead@example.com",
      LEAD_OFFER_SOURCE_LABEL,
      inWindow,
    );
    await seedApplication(
      "a3",
      "old@example.com",
      LEAD_OFFER_SOURCE_LABEL,
      new Date("2026-08-01T00:00:00.000Z"),
    );
    await seedApplication(
      "a4",
      "user@example.com",
      "Texte colle manuellement",
      inWindow,
    );

    await expect(store.readKeywordMatchActivations(WINDOW_START)).resolves.toBe(
      1,
    );
  });
});
